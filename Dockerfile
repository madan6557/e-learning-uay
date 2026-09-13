FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --ignore-scripts

COPY packages/db packages/db
RUN npm run db:generate

COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY packages/shared/src packages/shared/src
COPY apps/web apps/web

RUN npx tsc -p apps/api/tsconfig.json
RUN npm run build:web

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --ignore-scripts --include=dev && npm cache clean --force

COPY --from=builder /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/web/dist apps/web/dist
COPY packages/db packages/db
COPY packages/shared packages/shared
COPY scripts/railway-deploy.mjs scripts/railway-deploy.mjs
COPY scripts/railway-runtime.mjs scripts/railway-runtime.mjs
COPY scripts/oidc-fixture.mjs scripts/oidc-fixture.mjs
COPY scripts/file-service.mjs scripts/file-service.mjs

EXPOSE 3000
CMD ["sh", "-c", "node scripts/railway-deploy.mjs && node scripts/railway-runtime.mjs"]
