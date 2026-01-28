# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Dependencies
# Install all dependencies including devDependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Copy Prisma schema files (required for postinstall hook)
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Set build-time DATABASE_URL (required for Prisma config during postinstall)
# This is only used during build for prisma generate, not for actual DB connection
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=${DATABASE_URL}

# Install all dependencies (including devDependencies for build)
RUN npm ci

# ============================================
# Stage 2: Builder
# Build the Next.js application
# ============================================
FROM deps AS builder

WORKDIR /app

# Copy all source code
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Set DATABASE_URL for Next.js build (required for API route analysis)
# This is only used during build, not for actual DB connection
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
ENV DATABASE_URL=${DATABASE_URL}

# Build the application
RUN npm run build

# ============================================
# Stage 3: Prune
# Remove devDependencies to create smaller production dependency tree
# ============================================
FROM deps AS prune

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Prune devDependencies
RUN npm prune --omit=dev

# ============================================
# Stage 4: Production Runner
# Minimal production image with only runtime deps
# ============================================
FROM node:20-alpine AS runner

# Install required runtime dependencies
RUN apk add --no-cache libc6-compat openssl dumb-init

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy production dependencies from prune stage
COPY --from=prune --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application artifacts and source code
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=deps --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./prisma.config.ts

# Create uploads directory
RUN mkdir -p ./public/uploads/templates && \
    chown -R nextjs:nodejs ./public/uploads

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set hostname to listen on all interfaces
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
