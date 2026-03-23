# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

WORKDIR /app

ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

COPY . .

ARG VITE_API_URL=https://apiagenda.kesassessoria.com/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run prisma:generate \
  && npm run build \
  && npm prune --omit=dev --workspaces --include-workspace-root=false

FROM node:22-alpine AS api-runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3333

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh

RUN chmod +x /usr/local/bin/api-entrypoint.sh

WORKDIR /app/apps/api

EXPOSE 3333

CMD ["/usr/local/bin/api-entrypoint.sh"]

FROM nginx:1.27-alpine AS web-runner

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
