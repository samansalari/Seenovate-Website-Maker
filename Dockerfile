# Frontend build stage
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy root package files for frontend build
COPY package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source files and configs
COPY web ./web
COPY src ./src
COPY assets ./assets
COPY vite.web.config.mts ./
COPY tsconfig*.json ./
COPY biome.json ./
COPY components.json ./

# Build frontend (outputs to dist_web/)
RUN npm run build:web

# Backend build stage
FROM node:20-alpine AS backend-builder

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

# Install build tools for user apps (git, python, build-base for node-gyp)
RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Install production dependencies only
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy built server
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend (vite.web.config.mts outputs to dist_web/)
COPY --from=frontend-builder /app/dist_web ./public

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
