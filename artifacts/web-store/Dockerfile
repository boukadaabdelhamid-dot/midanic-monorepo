FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY artifacts/web-store/package.json ./artifacts/web-store/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/erp/package.json ./artifacts/erp/
COPY artifacts/mobile-store/package.json ./artifacts/mobile-store/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY lib ./lib
RUN pnpm install --frozen-lockfile=false --filter @workspace/web-store...

FROM deps AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV NODE_ENV=production
COPY tsconfig.base.json ./
COPY artifacts/web-store ./artifacts/web-store
RUN pnpm --filter @workspace/web-store run build

FROM base AS runtime
ENV NODE_ENV=production
RUN npm install -g serve@14
COPY --from=build /app/artifacts/web-store/dist/public /app/public
WORKDIR /app
EXPOSE 3000
CMD ["sh", "-c", "serve -s public -l ${PORT:-3000}"]
