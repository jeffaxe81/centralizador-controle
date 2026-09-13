import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

// TODO (Epico 8 / integracao com Keycloak): trocar esta leitura de header
// pela extracao do claim `tenant_id` do token JWT validado pelo
// AuthGuard do Keycloak. O header x-tenant-id fica so como placeholder
// para desenvolvimento local antes do SSO estar plugado -- NUNCA usar
// header vindo do cliente como fonte de tenant em producao, pois qualquer
// chamador poderia forjar acesso a outro tenant.
export const TenantId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const tenantId = request.headers['x-tenant-id'];

  if (!tenantId || typeof tenantId !== 'string') {
    throw new BadRequestException(
      'Tenant nao identificado (placeholder de dev: envie o header x-tenant-id; em producao isso vira do token do Keycloak)',
    );
  }

  return tenantId;
});
