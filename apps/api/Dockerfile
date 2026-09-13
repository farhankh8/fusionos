# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Native build tools required by argon2@0.45.x on alpine/musl as a fallback.
# argon2 ships prebuildify binaries (including linux-x64/musl) which
# node-gyp-build prefers; python3/make/g++ are kept so a from-source build is
# still possible if a prebuild ever goes missing. Build-stage only — the
# production image does not inherit these.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/validation/package.json ./packages/validation/

# Root "prepare": "husky" is a developer-machine git-hook installer and its
# binary is a ROOT devDependency, which workspace-scoped `npm ci` does not
# install. --ignore-scripts is therefore required for dependency installation.
# No application build depends on install-time lifecycle scripts: argon2 uses a
# shipped node-gyp-build prebuild (prebuilds/linux-x64/argon2.musl.node) and
# the Prisma client is generated explicitly in the builder stage below.
RUN npm ci --workspace=apps/api --workspace=packages/database --workspace=packages/shared --workspace=packages/types --workspace=packages/config --workspace=packages/validation --ignore-scripts

# argon2@0.45.1 ships a prebuildify binary for linux-x64/musl, but that published
# artifact segfaults (SIGSEGV, exit 139) when loaded on Node 20. Compile argon2
# from source here (python3/make/g++ above) so build/Release/argon2.node matches
# the runtime Node exactly; node-gyp-build prefers build/Release over prebuilds,
# so the broken binary is never loaded. Verified: require('argon2') works and
# hash()/verify() round-trip after this rebuild.
RUN npm_config_build_from_source=true npm rebuild argon2

# npm hoists most dependencies to the workspace root and only creates
# per-workspace node_modules for conflicting requirements. Create the folders
# so the build stage can COPY them unconditionally, whatever npm decided.
RUN mkdir -p apps/api/node_modules packages/database/node_modules \
    packages/shared/node_modules packages/types/node_modules \
    packages/config/node_modules packages/validation/node_modules


# Stage 2: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy the real npm dependency layout (root node_modules + any per-workspace ones)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /app/packages/validation/node_modules ./packages/validation/node_modules

# Workspace manifests so npm -w build can resolve the workspace graph
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/api/package.json ./apps/api/
COPY --from=deps /app/packages/database/package.json ./packages/database/
COPY --from=deps /app/packages/shared/package.json ./packages/shared/
COPY --from=deps /app/packages/types/package.json ./packages/types/
COPY --from=deps /app/packages/config/package.json ./packages/config/
COPY --from=deps /app/packages/validation/package.json ./packages/validation/

COPY . .

# Build dependency packages first (types/config/database depend on shared).
# packages/database type-checks against the GENERATED Prisma client, so
# `prisma generate` must run before it — not after.
RUN npm run build -w packages/shared
RUN npm run build -w packages/types
RUN npm run build -w packages/validation
RUN npm run build -w packages/config

# Prisma client generation (engines + .prisma into node_modules)
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

RUN npm run build -w packages/database

# API build
RUN npm run build -w apps/api

# Prune dev dependencies for the production image. Run at workspace root so
# npm resolves the workspace graph; keeps runtime deps + generated .prisma.
# The `prisma` CLI stays (it is a runtime dependency of @fusionos/database)
# because the container entrypoint runs `prisma migrate deploy` on boot.
RUN npm prune --omit=dev --ignore-scripts


# Stage 3: Production
FROM node:20-alpine AS production

WORKDIR /app

# Security: run as non-root
RUN addgroup -g 1001 -S fusionos && \
    adduser -S fusionos -u 1001

# Pruned production dependency tree (includes compiled argon2 binary + .prisma)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules

COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Prisma schema + migrations for `prisma migrate deploy` on boot
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Workspace manifests for module resolution
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/validation/package.json ./packages/validation/

# Entrypoint: run migrations (as migration role), then exec the server
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Build tooling (python3/make/g++) stays in the deps stage — not shipped here.
# Set ownership
RUN chown -R fusionos:fusionos /app

USER fusionos

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health/live || exit 1

# Start
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/main.js"]
