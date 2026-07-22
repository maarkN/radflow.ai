# Build from the repo root: docker build -f services/integration/Dockerfile .
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY services/integration ./services/integration
RUN pnpm install --frozen-lockfile --filter @radflow/integration... \
  && pnpm --filter @radflow/shared run build \
  && pnpm --filter @radflow/integration run build \
  && pnpm --filter @radflow/integration deploy --prod --legacy /out

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
EXPOSE 3002
CMD ["node", "dist/main.js"]
