# Build from the repo root: docker build -f services/worklist/Dockerfile .
FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY services/worklist ./services/worklist
RUN pnpm install --frozen-lockfile --filter @radflow/worklist... \
  && pnpm --filter @radflow/shared run build \
  && pnpm --filter @radflow/messaging run build \
  && pnpm --filter @radflow/ddd run build \
  && pnpm --filter @radflow/worklist run build \
  && pnpm --filter @radflow/worklist deploy --prod --legacy /out

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
EXPOSE 3001
CMD ["node", "dist/main.js"]
