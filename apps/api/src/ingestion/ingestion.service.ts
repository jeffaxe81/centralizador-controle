import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface IngestDataDto {
  sourceSystem: string; // ex.: "despacho", "crm-vendas"
  recordType: string;   // ex.: "user_deactivated", "user_created"
  rawPayload: Record<string, unknown>;
}

// Epico 7 -- Ingestao de Dados dos Sistemas Integrados (secao 7 da
// especificacao). Recebe, valida e normaliza antes de persistir.
//
// Decisao pendente com o negocio (explicitamente deixada em aberto na
// especificacao): se a ingestao deve realimentar o RBAC automaticamente
// (ex.: revogar acesso quando um usuario e desativado no sistema de
// origem) ou ser so informativa. Esta implementacao e SO INFORMATIVA por
// padrao -- grava o registro e nao mexe em Role/Profile nenhum. O gancho
// para automatizar isso mais tarde e o metodo `processAutomaticEffects`,
// que hoje so loga a intencao, sem executar nada.
@Injectable()
export class IngestionService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, sourceSystem?: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.ingestedRecord.findMany({
        where: { tenantId, ...(sourceSystem ? { sourceSystem } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    );
  }

  async ingest(tenantId: string, dto: IngestDataDto, actorId: string) {
    this.validate(dto);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const record = await tx.ingestedRecord.create({
        data: {
          tenantId,
          sourceSystem: dto.sourceSystem,
          recordType: dto.recordType,
          rawPayload: dto.rawPayload,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'DATA_INGESTED',
          targetType: 'IngestedRecord',
          targetId: record.id,
          metadata: { sourceSystem: dto.sourceSystem, recordType: dto.recordType },
        },
      });

      // So loga a intencao -- NAO executa nenhuma revogacao automatica
      // ate essa regra ser confirmada com o negocio.
      this.processAutomaticEffects(record.id, dto);

      return record;
    });
  }

  private processAutomaticEffects(recordId: string, dto: IngestDataDto) {
    if (dto.recordType === 'user_deactivated') {
      // TODO (decisao pendente com o negocio -- secao 7 da especificacao):
      // se confirmado que a revogacao deve ser automatica, este e o ponto
      // de entrada certo: buscar Profiles/Roles vinculados ao usuario
      // desativado e revogar, registrando PERMISSION_REVOKED no AuditLog.
      // Por ora, so sinaliza que o evento chegou e nao foi processado.
      // eslint-disable-next-line no-console
      console.log(
        `[ingestion] evento user_deactivated recebido (record ${recordId}) -- revogacao automatica NAO habilitada, apenas registrado`,
      );
    }
  }

  private validate(dto: IngestDataDto) {
    if (!dto.sourceSystem || !dto.recordType) {
      throw new BadRequestException('sourceSystem e recordType sao obrigatorios');
    }
    if (!dto.rawPayload || typeof dto.rawPayload !== 'object') {
      throw new BadRequestException('rawPayload precisa ser um objeto JSON');
    }
  }
}
