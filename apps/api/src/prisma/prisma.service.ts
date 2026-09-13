import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// PrismaService padrao, MAIS o helper `withTenant`, que e o pedaco que
// normalmente falta em tutoriais de RLS: a variavel de sessao do Postgres
// (`app.current_tenant_id`, ver ../../../prisma/migrations/*/migration.sql)
// so tem efeito dentro da MESMA transacao/conexao onde foi setada com
// `SET LOCAL`. Por isso toda query que depende de RLS precisa passar por
// `withTenant`, que abre uma transacao, seta o tenant, roda a query, e
// fecha -- nunca usar `this.prisma.role.findMany()` direto em rota
// multi-tenant, ou o RLS nao tem efeito nenhum.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async withTenant<T>(tenantId: string, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      // set_config com is_local=true equivale a SET LOCAL -- vale so para
      // esta transacao, nunca vaza para outra conexao do pool.
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
      return fn(tx as unknown as PrismaClient);
    });
  }
}
