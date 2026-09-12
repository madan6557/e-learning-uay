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

RUN npx tsc -p apps/api/tsconfig.json

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --ignore-scripts && npm cache clean --force

COPY --from=builder /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY packages/db packages/db
COPY packages/shared packages/shared
COPY scripts/railway-deploy.mjs scripts/railway-deploy.mjs

EXPOSE 3000
CMD ["sh", "-c", "node scripts/railway-deploy.mjs && node apps/api/dist/apps/api/src/index.js"]
