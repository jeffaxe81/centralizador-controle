import { Body, Controller, Get, Post } from '@nestjs/common';
import { PermissionsService, CreatePermissionDto } from './permissions.service';
import { TenantId } from '../common/tenant.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreatePermissionDto) {
    return this.service.create(tenantId, dto);
  }
}
