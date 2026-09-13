import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateProfileDto {
  name: string;
  description?: string;
  roleIds: string[];
}

export interface UpdateProfileDto {
  description?: string;
  roleIds: string[];
}

// Epico 4 -- Gestao de Perfis. O "versionamento de perfis (historico de
// alteracoes)" pedido na especificacao NAO ganhou uma tabela propria: em
// vez de duplicar o que o AuditLog append-only ja faz, cada update grava
// no AuditLog o snapshot de roleIds antes/depois -- a reconstrucao do
// historico completo de um perfil e uma query no AuditLog filtrando por
// targetId, nao uma tabela ProfileVersion separada. Se isso se mostrar
// insuficiente na pratica (ex.: precisar reverter para uma versao
// especifica com um clique), revisitar essa decisao no Epico 9.
@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.profile.findMany({
        where: { tenantId },
        include: { profileRoles: { include: { role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  findOne(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const profile = await tx.profile.findFirst({
        where: { id, tenantId },
        include: { profileRoles: { include: { role: true } } },
      });
      if (!profile) throw new NotFoundException('Perfil nao encontrado');
      return profile;
    });
  }

  async create(tenantId: string, dto: CreateProfileDto, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.profile.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (existing) {
        throw new ConflictException(`Ja existe um perfil "${dto.name}" neste tenant`);
      }

      // Confirma que as roles pertencem ao mesmo tenant antes de vincular
      // -- nao confiar so na FK, que nao garante isolamento por tenant.
      const validRoles = await tx.role.findMany({
        where: { id: { in: dto.roleIds }, tenantId },
        select: { id: true },
      });
      if (validRoles.length !== dto.roleIds.length) {
        throw new NotFoundException('Uma ou mais roles informadas nao existem neste tenant');
      }

      const profile = await tx.profile.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          profileRoles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
        },
        include: { profileRoles: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'PROFILE_CREATED',
          targetType: 'Profile',
          targetId: profile.id,
          metadata: { name: profile.name, roleIds: dto.roleIds, version: profile.version },
        },
      });

      return profile;
    });
  }

  async update(tenantId: string, id: string, dto: UpdateProfileDto, actorId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const profile = await tx.profile.findFirst({
        where: { id, tenantId },
        include: { profileRoles: true },
      });
      if (!profile) throw new NotFoundException('Perfil nao encontrado');

      const validRoles = await tx.role.findMany({
        where: { id: { in: dto.roleIds }, tenantId },
        select: { id: true },
      });
      if (validRoles.length !== dto.roleIds.length) {
        throw new NotFoundException('Uma ou mais roles informadas nao existem neste tenant');
      }

      const previousRoleIds = profile.profileRoles.map((pr) => pr.roleId);

      await tx.profileRole.deleteMany({ where: { profileId: id } });

      const updated = await tx.profile.update({
        where: { id },
        data: {
          description: dto.description,
          version: { increment: 1 },
          profileRoles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
        },
        include: { profileRoles: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'PROFILE_UPDATED',
          targetType: 'Profile',
          targetId: updated.id,
          metadata: {
            previousVersion: profile.version,
            newVersion: updated.version,
            previousRoleIds,
            newRoleIds: dto.roleIds,
          },
        },
      });

      return updated;
    });
  }
}
