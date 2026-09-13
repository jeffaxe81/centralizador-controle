import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyCompilerService } from '../policy-compiler/policy-compiler.service';

export type ModuleAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';

export interface RegisterExceptionDto {
  moduleKey: string;
  resource: string;
  action: ModuleAction;
  reason: string;
}

// Secao 6 do adendo tecnico -- mecanismo de justificativa registrada.
// MINIMO EXIGIDO nesta primeira versao: reason obrigatorio + auditoria
// append-only. A "aprovacao de um segundo administrador antes de entrar
// em vigor" (sugestao do adendo) NAO esta implementada como bloqueio --
// o campo approvedBy existe no schema, mas esta excecao ja entra em vigor
// (recompila o PolicyBundle) no momento do registro, antes de qualquer
// aprovacao. Se o negocio confirmar que precisa do bloqueio de fato, essa
// service precisa mudar para so recompilar apos `approve()`.
@Injectable()
export class LocalExceptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyCompiler: PolicyCompilerService,
  ) {}

  findAllActive(tenantId: string, moduleKey?: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.localException.findMany({
        where: { tenantId, revokedAt: null, ...(moduleKey ? { moduleKey } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  async register(tenantId: string, dto: RegisterExceptionDto, actorId: string) {
    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new BadRequestException(
        'Justificativa (reason) obrigatoria e precisa ter conteudo real (minimo 10 caracteres) -- excecao sem justificativa nao e registrada',
      );
    }

    const exception = await this.prisma.withTenant(tenantId, async (tx) => {
      const created = await tx.localException.create({
        data: {
          tenantId,
          moduleKey: dto.moduleKey,
          resource: dto.resource,
          action: dto.action,
          reason: dto.reason,
          registeredBy: actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'LOCAL_EXCEPTION_REGISTERED',
          targetType: 'LocalException',
          targetId: created.id,
          metadata: { moduleKey: dto.moduleKey, resource: dto.resource, action: dto.action, reason: dto.reason },
        },
      });

      return created;
    });

    // Uma excecao local muda o que o OPA decide -- precisa recompilar,
    // igual a um grant/revoke de permissao.
    await this.policyCompiler.recompileAndPublish(tenantId);

    return exception;
  }

  async revoke(tenantId: string, id: string, actorId: string) {
    const result = await this.prisma.withTenant(tenantId, async (tx) => {
      const exception = await tx.localException.findFirst({ where: { id, tenantId, revokedAt: null } });
      if (!exception) throw new NotFoundException('Excecao local nao encontrada ou ja revogada');

      const updated = await tx.localException.update({
        where: { id },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          action: 'LOCAL_EXCEPTION_REVOKED',
          targetType: 'LocalException',
          targetId: id,
          metadata: { revoked: true },
        },
      });

      return updated;
    });

    await this.policyCompiler.recompileAndPublish(tenantId);
    return result;
  }
}
