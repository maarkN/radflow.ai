# Build from the repo root: docker build -f services/dictation/Dockerfile .
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY services/dictation ./services/dictation
RUN pnpm install --frozen-lockfile --filter @radflow/dictation... \
  && pnpm --filter @radflow/shared run build \
  && pnpm --filter @radflow/dictation run build \
  && pnpm --filter @radflow/dictation deploy --prod --legacy /out

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
EXPOSE 3003
CMD ["node", "dist/main.js"]
