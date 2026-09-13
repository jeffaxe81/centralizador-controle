import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

// TODO (Epico 8 / integracao com Keycloak): trocar esta leitura de header
// pela extracao do claim `tenant_id` do token JWT validado pelo
// AuthGuard do Keycloak. O header x-tenant-id fica so como placeholder
// para desenvolvimento local antes do SSO estar plugado -- NUNCA usar
// header vindo do cliente como fonte de tenant em producao, pois qualquer
// chamador poderia forjar acesso a outro tenant.
//
// Validacao de formato UUID adicionada apos a POC de RLS (ver
// docs/checkpoints/2026-09-poc-rls-isolamento-tenant.md): sem isso, um
// tenantId vazio ou mal formado chega ate o Postgres e vira um erro cru
// de cast (500), em vez de um 400 claro aqui na borda.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TenantId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const tenantId = request.headers['x-tenant-id'];

  if (!tenantId || typeof tenantId !== 'string') {
    throw new BadRequestException(
      'Tenant nao identificado (placeholder de dev: envie o header x-tenant-id; em producao isso vira do token do Keycloak)',
    );
  }

  if (!UUID_REGEX.test(tenantId)) {
    throw new BadRequestException('x-tenant-id precisa ser um UUID valido');
  }

  return tenantId;
});
