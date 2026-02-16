FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/domain-policy/package.json packages/domain-policy/
COPY packages/domain-rating/package.json packages/domain-rating/
COPY packages/domain-product/package.json packages/domain-product/
COPY packages/persistence/package.json packages/persistence/
COPY packages/agents/package.json packages/agents/
COPY packages/governance/package.json packages/governance/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/
COPY . .
RUN pnpm build

FROM base AS runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/config ./config
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
