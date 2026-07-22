# Build from the repo root: docker build -f services/api-gateway/Dockerfile .
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY services/api-gateway ./services/api-gateway
RUN pnpm install --frozen-lockfile --filter @radflow/api-gateway... \
  && pnpm --filter @radflow/shared run build \
  && pnpm --filter @radflow/api-gateway run build \
  && pnpm --filter @radflow/api-gateway deploy --prod /out

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
EXPOSE 3000
CMD ["node", "dist/main.js"]
