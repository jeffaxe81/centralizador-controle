import { Body, Controller, Delete, Get, Param, Post, Query, Headers } from '@nestjs/common';
import { LocalExceptionsService, RegisterExceptionDto } from './local-exceptions.service';
import { TenantId } from '../common/tenant.decorator';

@Controller('local-exceptions')
export class LocalExceptionsController {
  constructor(private readonly service: LocalExceptionsService) {}

  @Get()
  findAllActive(@TenantId() tenantId: string, @Query('moduleKey') moduleKey?: string) {
    return this.service.findAllActive(tenantId, moduleKey);
  }

  @Post()
  register(
    @TenantId() tenantId: string,
    @Body() dto: RegisterExceptionDto,
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.service.register(tenantId, dto, actorId);
  }

  @Delete(':id')
  revoke(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.service.revoke(tenantId, id, actorId);
  }
}
