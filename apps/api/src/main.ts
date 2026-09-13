import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Toda requisição precisa carregar o tenant autenticado (claim tenant_id
  // do token emitido pelo Keycloak) para que o middleware de RLS possa
  // fazer `SET LOCAL app.current_tenant_id` na transação do Prisma.
  // Ver: ../../../rls_policies.sql

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
