import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateModuleDto {
  key: string;
  name: string;
  description?: string;
}

export interface RegisterModuleScopeDto {
  moduleId: string;
  resource: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  description?: string;
}

// Epico 3 -- Module Registry. Module e ModuleScope NAO sao escopados por
// tenant (catalogo global da plataforma -- ver comentario no
// schema.prisma), entao aqui NAO passamos por withTenant/RLS.
@Injectable()
export class ModulesRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.module.findMany({
      include: { scopes: { where: { deprecatedAt: null } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateModuleDto) {
    const existing = await this.prisma.module.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Modulo com key "${dto.key}" ja registrado`);
    }
    return this.prisma.module.create({ data: dto });
  }

  // Versionamento de escopo (secao 5 do adendo tecnico): registrar um novo
  // escopo NUNCA sobrescreve o anterior -- se ja existir um escopo igual
  // (mesmo resource+action) ainda ativo, este cria a proxima versao e marca
  // a anterior como depreciada, preservando o historico.
  async registerScope(dto: RegisterModuleScopeDto) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.moduleScope.findFirst({
        where: {
          moduleId: dto.moduleId,
          resource: dto.resource,
          action: dto.action,
          deprecatedAt: null,
        },
        orderBy: { version: 'desc' },
      });

      if (previous) {
        await tx.moduleScope.update({
          where: { id: previous.id },
          data: { deprecatedAt: new Date() },
        });
      }

      return tx.moduleScope.create({
        data: {
          moduleId: dto.moduleId,
          resource: dto.resource,
          action: dto.action,
          description: dto.description,
          version: (previous?.version ?? 0) + 1,
        },
      });
    });
  }
}
