import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PolicyBundlesService } from './policy-bundles.service';
import { IntegrationApiKeyGuard } from '../common/integration-api-key.guard';

// Rota chamada pelo OPAL server (OPAL_DATA_CONFIG_SOURCES), nao por
// usuarios -- reaproveitando o mesmo guard placeholder da ingestao
// (Epico 8) ate existir um mecanismo de autenticacao proprio para o OPAL
// (o OPAL suporta JWT proprio nesse tipo de rota; ainda nao configurado).
@UseGuards(IntegrationApiKeyGuard)
@Controller('policy-bundles')
export class PolicyBundlesController {
  constructor(private readonly service: PolicyBundlesService) {}

  @Get(':tenantId/data')
  getLatestData(@Param('tenantId') tenantId: string) {
    return this.service.getLatestData(tenantId);
  }
}
