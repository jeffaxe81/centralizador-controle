import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateRoleDto {
  name: string;
  description?: string;
}

// Epico 2 -- RBAC Core: CRUD de papeis. Repare que NENHUM metodo aqui
// avalia permissao -- isso e responsabilidade do OPA (ver
// packages/rbac-core/rego/authorization.rego). Este service so administra
// o estado (PAP), que depois e compilado para o data.json do PolicyBundle.
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.role.findMany({
        where: { tenantId },
        include: { rolePermissions: { include: { permission: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async create(tenantId: string, dto: CreateRoleDto, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.role.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (existing) {
        throw new ConflictException(`Ja existe uma role "${dto.name}" neste tenant`);
      }

      const role = await tx.role.create({
        data: { tenantId, name: dto.name, description: dto.description },
      });

      // Auditoria append-only (secao 8 da especificacao) -- toda criacao de
      // role e registrada, nunca so o CRUD silencioso.
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'ROLE_CREATED',
          targetType: 'Role',
          targetId: role.id,
          metadata: { name: role.name },
        },
      });

      return role;
    });
  }
}
