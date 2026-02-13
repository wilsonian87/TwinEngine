# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

RUN npm ci

# Copy source
COPY . .

# Build client (Vite → dist/public/) and server (esbuild → dist/index.cjs)
RUN npm run build

# Push database schema (Coolify provides DATABASE_URL and network access at build time)
ARG DATABASE_URL
RUN if [ -n "$DATABASE_URL" ]; then npx drizzle-kit push; fi

# ---- Production Stage ----
FROM node:20-slim

WORKDIR /app

# Copy package files for production install
COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

# Copy built output from builder
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.cjs"]
