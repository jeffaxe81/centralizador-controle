import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Fecha o ciclo desenhado na POC de OPA/OPAL (ver docs/checkpoints):
// toda vez que Role, Permission ou a atribuicao entre eles muda, este
// service recompila o data.json e publica a proxima versao do
// PolicyBundle. O endpoint /policy-bundles/:tenantId/data (consumido pelo
// OPAL) so LE o que este service escreve.
//
// GAP que ainda fica em aberto: local_restrictions (secao 6 do adendo --
// excecoes locais com justificativa) nao tem tabela propria no schema
// ainda, entao sempre publica vazio. Quando essa entidade for criada,
// este service precisa incluir os dados dela aqui tambem.
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
        // local_restrictions sempre vazio ate a entidade correspondente
        // existir no schema (ver comentario acima).
        dataJson: { roles_permissions: rolesPermissions, local_restrictions: {} },
        publishedAt: new Date(),
      },
    });

    this.logger.log(`PolicyBundle v${nextVersion} publicado para o tenant ${tenantId}`);
  }
}
