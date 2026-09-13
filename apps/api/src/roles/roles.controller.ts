import { Body, Controller, Delete, Get, Param, Post, Headers } from '@nestjs/common';
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
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.rolesService.create(tenantId, dto, actorId);
  }

  @Post(':id/permissions/:permissionId')
  assignPermission(
    @TenantId() tenantId: string,
    @Param('id') roleId: string,
    @Param('permissionId') permissionId: string,
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.rolesService.assignPermission(tenantId, roleId, permissionId, actorId);
  }

  @Delete(':id/permissions/:permissionId')
  revokePermission(
    @TenantId() tenantId: string,
    @Param('id') roleId: string,
    @Param('permissionId') permissionId: string,
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.rolesService.revokePermission(tenantId, roleId, permissionId, actorId);
  }
}
