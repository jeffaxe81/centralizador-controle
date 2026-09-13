# centralizador-controle

Modulo de RBAC centralizador, module registry, integration registry,
exportacao de perfis de acesso e ingestao de dados dos sistemas integrados
(Despacho, CRM, Motor de Eventos, futuros).

## Stack

- apps/web — Next.js (painel administrativo)
- apps/api — NestJS (API REST)
- packages/rbac-core — compilacao de Role/Permission/Profile para bundles
  Rego consumidos pelo OPA, distribuidos via OPAL
- packages/integration-registry — driver generico REST/JSON + contrato de
  adapter dedicado
- packages/shared — DTOs e tipos compartilhados
- prisma/ — schema e migrations (incluindo Row-Level Security por tenant)

## Setup

```bash
cp .env.example .env   # ajustar DATABASE_URL
npm install
npm run prisma:migrate
npm run dev:api
npm run dev:web
```

## Documentacao

Ver docs/arquitetura, docs/specs, docs/planos, docs/checkpoints.
