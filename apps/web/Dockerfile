# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY packages/validation/package.json ./packages/validation/

# Root "prepare": "husky" is a developer-machine git-hook installer and its
# binary is a ROOT devDependency, which workspace-scoped `npm ci` does not
# install. --ignore-scripts is therefore required for dependency installation.
# No application build depends on install-time lifecycle scripts — next build
# and the workspace package builds are invoked explicitly in the builder stage.
# npm hoists shared dependencies to /app/node_modules and only creates
# /app/apps/web/node_modules when the workspace has conflicting requirements —
# so the build stage copies the workspace ROOT node_modules, not per-package
# folders that may not exist.
RUN npm ci --workspace=apps/web --workspace=packages/shared --workspace=packages/types --workspace=packages/ui --workspace=packages/config --workspace=packages/validation --ignore-scripts


# Stage 2: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy the hoisted workspace dependency tree (deps stage layout = real npm layout)
COPY --from=deps /app/node_modules ./node_modules
# Workspace package manifests so npm -w build can resolve the workspace graph
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/web/package.json ./apps/web/
COPY --from=deps /app/packages/shared/package.json ./packages/shared/
COPY --from=deps /app/packages/types/package.json ./packages/types/
COPY --from=deps /app/packages/ui/package.json ./packages/ui/
COPY --from=deps /app/packages/config/package.json ./packages/config/
COPY --from=deps /app/packages/validation/package.json ./packages/validation/

COPY . .

# Ensure the static assets directory exists (Next allows its absence, but the
# production stage relies on it for the standalone image).
RUN mkdir -p apps/web/public

# NEXT_PUBLIC_* vars are inlined by Next.js into client bundles at build time.
# Serve as an explicit build arg so the standalone bundle targets the real API.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Shared packages build first (types/config/validation depend on shared), then
# the app. next build is invoked explicitly below (never skipped).
RUN npm run build -w packages/shared
RUN npm run build -w packages/types
RUN npm run build -w packages/validation
RUN npm run build -w packages/config
RUN npm run build -w packages/ui
RUN npm run build -w apps/web


# Stage 3: Production
FROM node:20-alpine AS production

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S fusionos && \
    adduser -S fusionos -u 1001

# Next.js standalone server binds to process.env.HOSTNAME; Docker sets it to the
# container IP, so without override loopback healthchecks fail. Force a global
# bind and production mode.
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Next.js standalone output bundles server.js + traced node_modules
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

RUN chown -R fusionos:fusionos /app

USER fusionos

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000 || exit 1

CMD ["node", "apps/web/server.js"]
