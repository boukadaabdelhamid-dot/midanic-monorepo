FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib ./lib
RUN pnpm install --frozen-lockfile=false --filter @workspace/api-server...

FROM deps AS build
COPY artifacts/api-server ./artifacts/api-server
RUN pnpm --filter @workspace/api-server run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/artifacts/api-server
EXPOSE 3000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
