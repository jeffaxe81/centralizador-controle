import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Fecha o ciclo desenhado na POC de OPA/OPAL (ver docs/checkpoints):
// toda vez que Role, Permission, a atribuicao entre eles, ou uma
// LocalException muda, este service recompila o data.json e publica a
// proxima versao do PolicyBundle. O endpoint /policy-bundles/:tenantId/data
// (consumido pelo OPAL) so LE o que este service escreve.
@Injectable()
export class PolicyCompilerService {
  private readonly logger = new Logger(PolicyCompilerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recompileAndPublish(tenantId: string): Promise<void> {
    const roles = await this.prisma.withTenant(tenantId, (tx) =>
      tx.role.findMany({
        where: { tenantId },
        include: {
          rolePermissions: {
            include: { permission: { include: { moduleScope: { include: { module: true } } } } },
          },
        },
      }),
    );

    const rolesPermissions: Record<string, Array<{ module: string; resource: string; action: string }>> = {};
    for (const role of roles) {
      rolesPermissions[role.name] = role.rolePermissions.map((rp) => ({
        module: rp.permission.moduleScope.module.key,
        resource: rp.permission.moduleScope.resource,
        action: rp.permission.moduleScope.action,
      }));
    }

    const activeExceptions = await this.prisma.withTenant(tenantId, (tx) =>
      tx.localException.findMany({ where: { tenantId, revokedAt: null } }),
    );

    const localRestrictions: Record<string, Array<{ resource: string; action: string; reason: string }>> = {};
    for (const exception of activeExceptions) {
      if (!localRestrictions[exception.moduleKey]) localRestrictions[exception.moduleKey] = [];
      localRestrictions[exception.moduleKey].push({
        resource: exception.resource,
        action: exception.action,
        reason: exception.reason,
      });
    }

    const lastBundle = await this.prisma.policyBundle.findFirst({
      where: { tenantId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastBundle?.version ?? 0) + 1;

    await this.prisma.policyBundle.create({
      data: {
        tenantId,
        version: nextVersion,
        staticPolicyVersion: '1.0.0',
        dataJson: { roles_permissions: rolesPermissions, local_restrictions: localRestrictions },
        publishedAt: new Date(),
      },
    });

    this.logger.log(`PolicyBundle v${nextVersion} publicado para o tenant ${tenantId}`);
  }
}
