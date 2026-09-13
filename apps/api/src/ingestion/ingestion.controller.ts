import { Body, Controller, Get, Post, Query, Headers, UseGuards } from '@nestjs/common';
import { IngestionService, IngestDataDto } from './ingestion.service';
import { TenantId } from '../common/tenant.decorator';
import { IntegrationApiKeyGuard } from '../common/integration-api-key.guard';

// Rota chamada pelos sistemas integrados (Despacho, crm-vendas), nao por
// usuarios finais -- protegida por API key de integracao (placeholder,
// ver IntegrationApiKeyGuard), nao pelo login de usuario do Keycloak.
@UseGuards(IntegrationApiKeyGuard)
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('sourceSystem') sourceSystem?: string) {
    return this.ingestionService.findAll(tenantId, sourceSystem);
  }

  @Post()
  ingest(
    @TenantId() tenantId: string,
    @Body() dto: IngestDataDto,
    @Headers('x-actor-id') actorId = 'system-integration',
  ) {
    return this.ingestionService.ingest(tenantId, dto, actorId);
  }
}
