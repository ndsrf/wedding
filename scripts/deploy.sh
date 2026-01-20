#!/bin/bash
#
# Wedding Platform Deployment Script
# Handles deployment with health checks and automatic rollback
#
# Usage:
#   ./deploy.sh --image ghcr.io/user/repo:tag
#   ./deploy.sh --rollback
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="${SCRIPT_DIR}"
BACKUP_DIR="${DEPLOY_DIR}/backups"
LOG_FILE="${DEPLOY_DIR}/deploy.log"
HEALTH_ENDPOINT="/api/health"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=10
STARTUP_WAIT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        INFO)  color="$GREEN" ;;
        WARN)  color="$YELLOW" ;;
        ERROR) color="$RED" ;;
        *)     color="$NC" ;;
    esac

    echo -e "${color}[$timestamp] [$level] $message${NC}"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Parse command line arguments
IMAGE_TAG=""
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --image)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --help)
            echo "Usage: $0 --image <image:tag> | --rollback"
            exit 0
            ;;
        *)
            error_exit "Unknown option: $1"
            ;;
    esac
done

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup of current state
create_backup() {
    local backup_name
    backup_name="backup_$(date '+%Y%m%d_%H%M%S')"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    log "INFO" "Creating backup: ${backup_name}"
    mkdir -p "$backup_path"

    # Save current docker-compose state
    if [ -f "${DEPLOY_DIR}/docker-compose.yml" ]; then
        cp "${DEPLOY_DIR}/docker-compose.yml" "${backup_path}/"
    fi

    # Save current .env
    if [ -f "${DEPLOY_DIR}/.env" ]; then
        cp "${DEPLOY_DIR}/.env" "${backup_path}/"
    fi

    # Save currently running image tags
    docker compose ps --format json 2>/dev/null | jq -r '.Image' > "${backup_path}/images.txt" || true

    # Save the backup name for potential rollback
    echo "$backup_name" > "${DEPLOY_DIR}/.last_backup"

    log "INFO" "Backup created successfully"
}

# Get the app URL from environment or use default
get_app_url() {
    if [ -f "${DEPLOY_DIR}/.env" ]; then
        # shellcheck disable=SC1091
        source "${DEPLOY_DIR}/.env"
    fi
    echo "${APP_URL:-http://localhost:3000}"
}

# Health check function
health_check() {
    local url
    url="$(get_app_url)${HEALTH_ENDPOINT}"
    local retry_count=0

    log "INFO" "Starting health checks at: ${url}"

    while [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; do
        local http_code
        local response

        # Get both HTTP code and response body
        response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null || echo -e "\n000")
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')

        if [ "$http_code" = "200" ]; then
            # Parse the response to check if status is healthy
            local status
            status=$(echo "$body" | jq -r '.status' 2>/dev/null || echo "unknown")

            if [ "$status" = "healthy" ]; then
                log "INFO" "Health check passed! Status: ${status}"
                return 0
            else
                log "WARN" "Health check returned 200 but status is: ${status}"
            fi
        fi

        retry_count=$((retry_count + 1))
        log "WARN" "Health check attempt ${retry_count}/${HEALTH_CHECK_RETRIES} failed (HTTP ${http_code})"

        if [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; then
            log "INFO" "Retrying in ${HEALTH_CHECK_INTERVAL} seconds..."
            sleep "$HEALTH_CHECK_INTERVAL"
        fi
    done

    log "ERROR" "Health check failed after ${HEALTH_CHECK_RETRIES} attempts"
    return 1
}

# Pull new Docker image
pull_image() {
    local image="$1"
    log "INFO" "Pulling Docker image: ${image}"

    if ! docker pull "$image"; then
        error_exit "Failed to pull Docker image: ${image}"
    fi

    log "INFO" "Image pulled successfully"
}

# Stop old containers
stop_containers() {
    log "INFO" "Stopping old containers..."

    # Graceful shutdown with timeout
    docker compose stop -t 30 app nginx 2>/dev/null || true

    log "INFO" "Old containers stopped"
}

# Start new containers
start_containers() {
    local image="$1"
    log "INFO" "Starting new containers with image: ${image}"

    # Update the image in docker-compose or use environment variable
    export APP_IMAGE="${image}"

    # Start services
    if ! docker compose up -d --no-deps app; then
        error_exit "Failed to start app container"
    fi

    # Wait for app to be ready before starting nginx
    log "INFO" "Waiting ${STARTUP_WAIT} seconds for app to start..."
    sleep "$STARTUP_WAIT"

    # Start nginx
    if ! docker compose up -d nginx; then
        log "WARN" "Failed to start nginx, but app may still be running"
    fi

    log "INFO" "Containers started"
}

# Rollback to previous state
rollback() {
    log "WARN" "Starting rollback..."

    local last_backup_file="${DEPLOY_DIR}/.last_backup"

    if [ ! -f "$last_backup_file" ]; then
        error_exit "No backup found for rollback"
    fi

    local backup_name
    backup_name=$(cat "$last_backup_file")
    local backup_path="${BACKUP_DIR}/${backup_name}"

    if [ ! -d "$backup_path" ]; then
        error_exit "Backup directory not found: ${backup_path}"
    fi

    log "INFO" "Rolling back to backup: ${backup_name}"

    # Stop current containers
    docker compose stop -t 30 app nginx 2>/dev/null || true

    # Restore backup files
    if [ -f "${backup_path}/docker-compose.yml" ]; then
        cp "${backup_path}/docker-compose.yml" "${DEPLOY_DIR}/"
    fi

    if [ -f "${backup_path}/.env" ]; then
        cp "${backup_path}/.env" "${DEPLOY_DIR}/"
    fi

    # Get previous image from backup
    if [ -f "${backup_path}/images.txt" ]; then
        local prev_image
        prev_image=$(head -n1 "${backup_path}/images.txt")
        if [ -n "$prev_image" ]; then
            log "INFO" "Restoring previous image: ${prev_image}"
            export APP_IMAGE="${prev_image}"
        fi
    fi

    # Start containers with previous configuration
    docker compose up -d app nginx

    # Verify rollback was successful
    sleep "$STARTUP_WAIT"
    if health_check; then
        log "INFO" "Rollback completed successfully"
    else
        log "ERROR" "Rollback may have failed - manual intervention required"
        exit 1
    fi
}

# Cleanup old backups (keep last 5)
cleanup_old_backups() {
    log "INFO" "Cleaning up old backups..."

    local backup_count
    backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name 'backup_*' | wc -l)

    if [ "$backup_count" -gt 5 ]; then
        find "$BACKUP_DIR" -maxdepth 1 -type d -name 'backup_*' | \
            sort | \
            head -n $((backup_count - 5)) | \
            xargs rm -rf
        log "INFO" "Removed $((backup_count - 5)) old backups"
    fi
}

# Cleanup old Docker images
cleanup_old_images() {
    log "INFO" "Cleaning up old Docker images..."

    # Remove dangling images
    docker image prune -f 2>/dev/null || true

    # Remove old images (keep last 3 versions)
    docker images --format "{{.Repository}}:{{.Tag}}" | \
        grep -E "^ghcr.io/.*wedding" | \
        tail -n +4 | \
        xargs -r docker rmi 2>/dev/null || true

    log "INFO" "Image cleanup completed"
}

# Main deployment function
deploy() {
    local image="$1"

    log "INFO" "========================================="
    log "INFO" "Starting deployment"
    log "INFO" "Image: ${image}"
    log "INFO" "========================================="

    # Create backup before deployment
    create_backup

    # Pull the new image
    pull_image "$image"

    # Stop old containers
    stop_containers

    # Start new containers
    start_containers "$image"

    # Health check
    if ! health_check; then
        log "ERROR" "Deployment failed health check, initiating rollback..."
        rollback
        error_exit "Deployment failed and was rolled back"
    fi

    # Cleanup
    cleanup_old_backups
    cleanup_old_images

    log "INFO" "========================================="
    log "INFO" "Deployment completed successfully!"
    log "INFO" "========================================="
}

# Main entry point
main() {
    cd "$DEPLOY_DIR"

    if [ "$ROLLBACK" = true ]; then
        rollback
        exit 0
    fi

    if [ -z "$IMAGE_TAG" ]; then
        error_exit "No image specified. Use --image <image:tag> or --rollback"
    fi

    deploy "$IMAGE_TAG"
}

# Run main
main
