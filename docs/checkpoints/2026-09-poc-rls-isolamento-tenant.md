# Checkpoint — POC: isolamento por RLS validado com Postgres real

Data: 2026-09-13

## O que foi testado

Subi um PostgreSQL 16 real (via apt) e apliquei exatamente a policy de
`rls_policies.sql` numa tabela `roles` equivalente ao schema.prisma, com
dois tenants e uma role para cada. Testes rodados como usuario comum
(nao superuser -- RLS nao se aplica a superusers, entao o teste PRECISA
rodar como o usuario da aplicacao).

## Resultados

1. **Isolamento de leitura**: Tenant A ve so sua propria role; Tenant B
   ve so a dele. Confirmado.
2. **Tenant forjando tenant_id no INSERT**: Tenant A tentou inserir uma
   role com `tenant_id` do Tenant B (simulando um payload malicioso ou
   um bug que nao filtra direito) -- bloqueado pelo Postgres:
   `ERROR: new row violates row-level security policy for table "roles"`.
   Isso confirma que a policy (so com `USING`, sem `WITH CHECK` explicito)
   protege tambem contra escrita forjada, nao so leitura.
3. **UPDATE cross-tenant**: Tenant A tentou UPDATE numa role do Tenant B
   -- afetou 0 linhas (a policy filtra a linha do working set antes do
   UPDATE conseguir enxergá-la). A descricao real do Tenant B ficou
   intacta.
4. **Achado que exige acao**: sem `app.current_tenant_id` setado (ou
   setado como string vazia), a query NAO retorna vazio silenciosamente
   -- ela lanca erro (`invalid input syntax for type uuid`). E um modo de
   falha seguro (nenhum dado vaza), mas `PrismaService.withTenant` e
   quem toda rota usa para acessar dados de tenant -- se o tenantId
   vier vazio/invalido do `TenantId` decorator, o erro que chega pro
   usuario final hoje seria um 500 cru do Postgres, nao um 400 claro.
   AJUSTE RECOMENDADO: validar que tenantId e um UUID valido no proprio
   `TenantId` decorator (ou em um pipe), antes de chegar no Prisma.

## Limitacao do teste

Testado com uma tabela simplificada (so `roles`), nao com o schema
Prisma completo (ainda bloqueado por nao conseguir rodar `prisma
generate` neste ambiente -- ver docs/checkpoints anteriores). A policy
testada foi copiada literalmente de `rls_policies.sql`, entao o
resultado se aplica a ela, mas a extrapolacao para as outras tabelas
(profiles, integrations etc., que usam a mesma forma de policy) e
razoavel, nao 100% testada uma por uma.

## Proximo passo recomendado

Adicionar validacao de formato UUID no `TenantId` decorator
(apps/api/src/common/tenant.decorator.ts), retornando 400 em vez de
deixar o erro de RLS estourar como 500.
