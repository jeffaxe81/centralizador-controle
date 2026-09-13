import { Body, Controller, Get, Post, Query, Headers } from '@nestjs/common';
import { IngestionService, IngestDataDto } from './ingestion.service';
import { TenantId } from '../common/tenant.decorator';

// TODO (Epico 8 -- Seguranca): esta rota recebe chamadas dos sistemas
// integrados (Despacho, crm-vendas), nao de usuarios finais -- precisa de
// autenticacao por API key/mTLS por integracao (nao o mesmo AuthGuard de
// usuario do Keycloak), ainda nao implementada.
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
