import { Body, Controller, Get, Post, Headers } from '@nestjs/common';
import { RolesService, CreateRoleDto } from './roles.service';
import { TenantId } from '../common/tenant.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.rolesService.findAll(tenantId);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateRoleDto,
    // TODO (Keycloak): trocar por request.user.sub apos o AuthGuard estar
    // plugado. Por ora aceita um header de dev para nao bloquear o Epico 2.
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.rolesService.create(tenantId, dto, actorId);
  }
}
