# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy server source and config
COPY server/src ./src
COPY server/tsconfig.json ./
COPY server/drizzle.config.ts ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies only
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy built server
COPY --from=builder /app/dist ./dist

# Copy migrations
COPY server/drizzle ./drizzle

# Create data directory for storage (Railway volume mount point)
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV STORAGE_PATH=/app/data

# Expose port (Railway uses PORT env var)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/health || exit 1

# Run server
CMD ["node", "dist/index.js"]

