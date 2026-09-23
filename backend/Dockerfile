# ---- Base ----------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---- Dependencies (all, incl. dev, for build) -----------------------------
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ---- Build -----------------------------------------------------------------
FROM base AS build
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
    && npm prune --omit=dev

# ---- Production runtime -----------------------------------------------------
FROM node:22-alpine AS production
ARG GIT_SHA=unknown
ENV NODE_ENV=production \
    GIT_SHA=${GIT_SHA}
WORKDIR /app

RUN apk add --no-cache libc6-compat curl \
    && addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health/live || exit 1

CMD ["node", "dist/index.js"]