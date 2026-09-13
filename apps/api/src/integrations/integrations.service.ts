import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type IntegrationProtocol = 'REST_JSON' | 'WEBHOOK' | 'ADAPTER';

export interface CreateIntegrationDto {
  name: string;
  protocol: IntegrationProtocol;
  baseUrl: string;
  credentialRef: string; // referencia ao vault -- NUNCA a credencial em si
  fieldMapping: Record<string, string>;
}

// Epico 5 -- Integration Registry. Escopo do driver generico limitado a
// REST_JSON com mapeamento simples de campos (decisao registrada no
// adendo tecnico, secao 3). WEBHOOK e ADAPTER sao aceitos no cadastro (o
// modulo pode precisar de um adapter dedicado depois), mas o Export
// Service (Epico 6) so vai saber executar REST_JSON sozinho -- os outros
// dois ficam com status "requer implementacao dedicada" ate terem um
// adapter proprio escrito.
@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.integration.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    );
  }

  findOne(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const integration = await tx.integration.findFirst({ where: { id, tenantId } });
      if (!integration) throw new NotFoundException('Integracao nao encontrada');
      return integration;
    });
  }

  async create(tenantId: string, dto: CreateIntegrationDto, actorId: string) {
    this.validate(dto);

    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.integration.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (existing) {
        throw new ConflictException(`Ja existe uma integracao "${dto.name}" neste tenant`);
      }

      const integration = await tx.integration.create({
        data: {
          tenantId,
          name: dto.name,
          protocol: dto.protocol,
          baseUrl: dto.baseUrl,
          credentialRef: dto.credentialRef,
          fieldMapping: dto.fieldMapping,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'INTEGRATION_CREATED',
          targetType: 'Integration',
          targetId: integration.id,
          metadata: { name: integration.name, protocol: integration.protocol },
        },
      });

      return integration;
    });
  }

  private validate(dto: CreateIntegrationDto) {
    if (!dto.credentialRef || dto.credentialRef.trim().length === 0) {
      throw new BadRequestException(
        'credentialRef e obrigatorio -- credenciais nunca sao aceitas diretamente aqui, apenas a referencia ao vault (secao 4 do adendo tecnico)',
      );
    }
    if (!/^https?:\/\//.test(dto.baseUrl)) {
      throw new BadRequestException('baseUrl precisa ser uma URL http(s) valida');
    }
    if (dto.protocol === 'REST_JSON' && Object.keys(dto.fieldMapping ?? {}).length === 0) {
      throw new BadRequestException(
        'fieldMapping nao pode ser vazio para protocolo REST_JSON (driver generico precisa do mapeamento de-para)',
      );
    }
  }
}
