import { Body, Controller, Get, Param, Post, Headers } from '@nestjs/common';
import { IntegrationsService, CreateIntegrationDto } from './integrations.service';
import { TenantId } from '../common/tenant.decorator';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.integrationsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.integrationsService.findOne(tenantId, id);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateIntegrationDto,
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.integrationsService.create(tenantId, dto, actorId);
  }
}
