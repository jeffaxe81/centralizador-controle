# Arquitetura

- Decisão de arquitetura (OPA + OPAL + Apache Syncope/midPoint + Keycloak),
  riscos e mitigacoes: ver o adendo tecnico compartilhado no processo
  (centralizador-controle-adendo-tecnico.docx) e o diagrama de arquitetura
  gerado na mesma discussao.
- Stack: Next.js (apps/web) + NestJS (apps/api) + PostgreSQL + Prisma,
  monorepo com npm workspaces.
- Multi-tenant nativo desde o Epico 1 (tenantId + Row-Level Security).
