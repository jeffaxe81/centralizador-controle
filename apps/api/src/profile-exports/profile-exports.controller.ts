import { Body, Controller, Get, Param, Post, Headers } from '@nestjs/common';
import { ProfileExportsService, RequestExportDto } from './profile-exports.service';
import { TenantId } from '../common/tenant.decorator';

// Rota separada de /profiles para nao sobrecarregar o ProfilesController
// com a logica de traducao/envio -- mas semanticamente e a pergunta
// "deseja exportar este perfil?" da secao 6 da especificacao.
@Controller('profile-exports')
export class ProfileExportsController {
  constructor(private readonly service: ProfileExportsService) {}

  @Get('by-profile/:profileId')
  findAllByProfile(@TenantId() tenantId: string, @Param('profileId') profileId: string) {
    return this.service.findAllByProfile(tenantId, profileId);
  }

  @Post()
  requestExport(
    @TenantId() tenantId: string,
    @Body() dto: RequestExportDto,
    @Headers('x-actor-id') actorId = 'dev-placeholder',
  ) {
    return this.service.requestExport(tenantId, dto, actorId);
  }
}
