import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePermissionDto {
  moduleScopeId: string;
  scope?: 'GLOBAL' | 'ORGANIZATION' | 'MODULE';
}

// GAP que fechei agora: antes disto, nao havia como criar uma Permission
// referenciando um ModuleScope do catalogo -- so o schema previa a
// entidade, sem service/controller nenhum.
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.permission.findMany({ where: { tenantId }, include: { moduleScope: { include: { module: true } } } }),
    );
  }

  async create(tenantId: string, dto: CreatePermissionDto) {
    const moduleScope = await this.prisma.moduleScope.findUnique({ where: { id: dto.moduleScopeId } });
    if (!moduleScope) throw new NotFoundException('ModuleScope nao encontrado');
    if (moduleScope.deprecatedAt) {
      throw new ConflictException('Nao e possivel criar permissao para um escopo de modulo depreciado');
    }

    return this.prisma.withTenant(tenantId, (tx) =>
      tx.permission.create({
        data: { tenantId, moduleScopeId: dto.moduleScopeId, scope: dto.scope ?? 'MODULE' },
      }),
    );
  }
}
