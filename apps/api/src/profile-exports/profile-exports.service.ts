import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { VaultService } from '../vault/vault.service';

export interface RequestExportDto {
  profileId: string;
  integrationId: string;
}

// Epico 6/8 -- fluxo de exportacao (secao 6 da especificacao) agora
// completo ate o envio real para REST_JSON: resolve a credencial via
// VaultService (nunca le a credencial direto do banco) e faz a chamada
// HTTP de fato, atualizando o status (SUCCESS/FAILED) com o resultado.
//
// WEBHOOK/ADAPTER continuam sem suporte generico (decisao do adendo,
// secao 3) -- ficam FAILED com mensagem clara ate ganharem adapter
// dedicado.
@Injectable()
export class ProfileExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly vault: VaultService,
  ) {}

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
    const { profile, integration } = await this.prisma.withTenant(tenantId, async (tx) => {
      const profile = await tx.profile.findFirst({
        where: { id: dto.profileId, tenantId },
        include: {
          profileRoles: { include: { role: true } },
        },
      });
      if (!profile) throw new NotFoundException('Perfil nao encontrado');

      const integration = await tx.integration.findFirst({
        where: { id: dto.integrationId, tenantId, isActive: true },
      });
      if (!integration) throw new NotFoundException('Integracao nao encontrada ou inativa');

      return { profile, integration };
    });

    const payload = this.translateProfile(profile, integration.fieldMapping as Record<string, string>);

    // Cria o registro como PENDING primeiro -- se o envio falhar (rede,
    // credencial, timeout), o registro ja existe para consulta/retentativa
    // manual, em vez de perder o rastro da tentativa.
    let profileExportId!: string; // atribuido dentro do withTenant abaixo -- assertion de atribuicao definitiva, TS nao ve atribuicao atraves de closures
    await this.prisma.withTenant(tenantId, async (tx) => {
      const created = await tx.profileExport.create({
        data: { tenantId, profileId: profile.id, integrationId: integration.id, payload, status: 'PENDING' },
      });
      profileExportId = created.id;
    });

    if (integration.protocol !== 'REST_JSON') {
      return this.finalizeExport(
        tenantId,
        profileExportId!,
        actorId,
        'FAILED',
        `Protocolo ${integration.protocol} requer adapter dedicado, ainda nao implementado`,
      );
    }

    try {
      const credential = await this.vault.resolveSecret(integration.credentialRef);

      await firstValueFrom(
        this.http.post(integration.baseUrl, payload, {
          headers: { Authorization: `Bearer ${credential}` },
          timeout: 10_000,
        }),
      );

      return this.finalizeExport(tenantId, profileExportId!, actorId, 'SUCCESS');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao exportar perfil';
      return this.finalizeExport(tenantId, profileExportId!, actorId, 'FAILED', message);
    }
  }

  private async finalizeExport(
    tenantId: string,
    profileExportId: string,
    actorId: string,
    status: 'SUCCESS' | 'FAILED',
    errorMessage?: string,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const updated = await tx.profileExport.update({
        where: { id: profileExportId },
        data: { status, errorMessage },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'PROFILE_EXPORTED',
          targetType: 'ProfileExport',
          targetId: updated.id,
          metadata: { status, errorMessage },
        },
      });

      return updated;
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
