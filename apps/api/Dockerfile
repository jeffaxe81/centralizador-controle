# Dockerfile minimo de desenvolvimento -- nao otimizado para producao
# (sem multi-stage, sem usuario nao-root ainda). Suficiente para rodar a
# API dentro do docker-compose local.
FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/rbac-core/package.json packages/rbac-core/package.json
COPY packages/integration-registry/package.json packages/integration-registry/package.json

RUN npm install

COPY . .

RUN npm run prisma:generate
RUN npm run build --workspace=apps/api

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
