import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyCompilerService } from '../policy-compiler/policy-compiler.service';

export interface CreateRoleDto {
  name: string;
  description?: string;
}

// Epico 2 -- RBAC Core: CRUD de papeis + atribuicao de permissao. Toda
// mudanca que afeta o que uma role concede dispara `recompileAndPublish`,
// fechando o ciclo ate o PolicyBundle que o OPAL consome.
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyCompiler: PolicyCompilerService,
  ) {}

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
    // Role recem-criada ainda nao tem permissao nenhuma -- nao precisa
    // recompilar aqui, so quando uma permissao for de fato atribuida.
  }

  async assignPermission(tenantId: string, roleId: string, permissionId: string, actorId: string) {
    await this.prisma.withTenant(tenantId, async (tx) => {
      const role = await tx.role.findFirst({ where: { id: roleId, tenantId } });
      if (!role) throw new NotFoundException('Role nao encontrada');

      const permission = await tx.permission.findFirst({ where: { id: permissionId, tenantId } });
      if (!permission) throw new NotFoundException('Permission nao encontrada neste tenant');

      await tx.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        create: { roleId, permissionId },
        update: {},
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'PERMISSION_GRANTED',
          targetType: 'Role',
          targetId: roleId,
          metadata: { permissionId },
        },
      });
    });

    // Recompila FORA da transacao acima -- precisa que o grant ja esteja
    // commitado antes de recompilar, senao a leitura ve o estado antigo.
    await this.policyCompiler.recompileAndPublish(tenantId);
  }

  async revokePermission(tenantId: string, roleId: string, permissionId: string, actorId: string) {
    await this.prisma.withTenant(tenantId, async (tx) => {
      const role = await tx.role.findFirst({ where: { id: roleId, tenantId } });
      if (!role) throw new NotFoundException('Role nao encontrada');

      await tx.rolePermission.deleteMany({ where: { roleId, permissionId } });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'PERMISSION_REVOKED',
          targetType: 'Role',
          targetId: roleId,
          metadata: { permissionId },
        },
      });
    });

    await this.policyCompiler.recompileAndPublish(tenantId);
  }
}
