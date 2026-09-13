import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RequestExportDto {
  profileId: string;
  integrationId: string;
}

// Epico 6 -- fluxo descrito na secao 6 da especificacao: ao finalizar a
// criacao/edicao de um perfil, o sistema pergunta se deseja exportar, e
// aqui e onde essa exportacao de fato acontece.
//
// Escopo desta primeira versao: so sabe executar REST_JSON (decisao do
// adendo, secao 3). WEBHOOK/ADAPTER ficam com status FAILED e uma mensagem
// clara -- nao finge que executou algo que nao tem adapter dedicado ainda.
@Injectable()
export class ProfileExportsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllByProfile(tenantId: string, profileId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.profileExport.findMany({
        where: { tenantId, profileId },
        orderBy: { createdAt: 'desc' },
        include: { integration: { select: { name: true, protocol: true } } },
      }),
    );
  }

  async requestExport(tenantId: string, dto: RequestExportDto, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const profile = await tx.profile.findFirst({
        where: { id: dto.profileId, tenantId },
        include: { profileRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
      });
      if (!profile) throw new NotFoundException('Perfil nao encontrado');

      const integration = await tx.integration.findFirst({
        where: { id: dto.integrationId, tenantId, isActive: true },
      });
      if (!integration) throw new NotFoundException('Integracao nao encontrada ou inativa');

      // Traduz o perfil para o payload do sistema-alvo usando o fieldMapping
      // configurado -- driver generico REST/JSON, mapeamento de-para simples
      // (sem logica condicional, conforme decisao do adendo).
      const payload = this.translateProfile(profile, integration.fieldMapping as Record<string, string>);

      if (integration.protocol !== 'REST_JSON') {
        const failedExport = await tx.profileExport.create({
          data: {
            tenantId,
            profileId: profile.id,
            integrationId: integration.id,
            payload,
            status: 'FAILED',
            errorMessage: `Protocolo ${integration.protocol} requer adapter dedicado, ainda nao implementado`,
          },
        });
        return failedExport;
      }

      // Stub de envio HTTP -- o Epico 6 real precisa de um HttpService
      // configurado com o credentialRef resolvido contra o vault. Aqui so
      // registramos a intencao como PENDING, sem chamar rede nenhuma,
      // ate essa peca (resolucao de credencial) estar implementada.
      const profileExport = await tx.profileExport.create({
        data: {
          tenantId,
          profileId: profile.id,
          integrationId: integration.id,
          payload,
          status: 'PENDING',
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'PROFILE_EXPORTED',
          targetType: 'ProfileExport',
          targetId: profileExport.id,
          metadata: { profileId: profile.id, integrationId: integration.id },
        },
      });

      return profileExport;
    });
  }

  private translateProfile(
    profile: { name: string; profileRoles: Array<{ role: { name: string } }> },
    fieldMapping: Record<string, string>,
  ): Record<string, unknown> {
    if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
      throw new BadRequestException('Integracao sem fieldMapping configurado -- nao ha como traduzir o perfil');
    }

    const sourceData: Record<string, unknown> = {
      'profile.name': profile.name,
      'profile.roles': profile.profileRoles.map((pr) => pr.role.name),
    };

    const payload: Record<string, unknown> = {};
    for (const [targetField, sourcePath] of Object.entries(fieldMapping)) {
      payload[targetField] = sourceData[sourcePath] ?? null;
    }
    return payload;
  }
}
