# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Dependencies
# Install all dependencies including devDependencies
# ============================================
FROM node:20-alpine AS deps

# Install libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Set build-time DATABASE_URL (required by Prisma 7 config)
# This is only used during build for prisma generate, not for actual DB connection
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# ============================================
# Stage 2: Builder
# Build the Next.js application
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
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
# Stage 3: Production Runner
# Minimal production image with only runtime deps
# ============================================
FROM node:20-alpine AS runner

# Install security updates and required runtime dependencies
RUN apk add --no-cache libc6-compat openssl dumb-init && \
    apk upgrade --no-cache

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application artifacts
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache and create uploads directory
RUN mkdir .next && \
    chown nextjs:nodejs .next && \
    mkdir -p ./public/uploads/templates && \
    chown -R nextjs:nodejs ./public/uploads

# Copy standalone output (Next.js standalone mode)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./prisma.config.ts

# Copy public locales for i18n
COPY --from=builder /app/public/locales ./public/locales

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
