import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

// Epico 8 -- autenticacao por integracao (secao 8 da especificacao):
// "API key rotacionavel / OAuth2 / mTLS, conforme o sistema".
//
// Implementacao atual: PLACEHOLDER comparando contra uma unica variavel de
// ambiente (INGESTION_API_KEY), sem rotacao nem chave por integracao. Isso
// e suficiente para nao deixar a rota de ingestao completamente aberta
// enquanto o modelo de credencial por integracao (chave por sistema
// integrado, rotacao, mTLS onde fizer sentido) nao e desenhado e
// implementado de verdade -- nao deve ser considerado a solucao final.
@Injectable()
export class IntegrationApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-integration-api-key'];
    const expected = process.env.INGESTION_API_KEY;

    if (!expected) {
      throw new UnauthorizedException(
        'INGESTION_API_KEY nao configurada no ambiente -- rota de ingestao bloqueada por seguranca',
      );
    }

    if (apiKey !== expected) {
      throw new UnauthorizedException('API key de integracao invalida ou ausente');
    }

    return true;
  }
}
