import { Injectable, InternalServerErrorException } from '@nestjs/common';

// Abstracao de resolucao de segredo -- decisao do adendo tecnico, secao 4:
// credenciais de integracao NUNCA ficam no banco, so a referencia
// (Integration.credentialRef). Este service e quem resolve essa referencia
// para o valor real, na hora do uso, sem nunca persistir o valor resolvido.
//
// Implementacao atual: MOCK baseado em variavel de ambiente, so para o
// fluxo funcionar ponta a ponta em desenvolvimento. Antes de ir para
// producao, trocar `resolveSecret` por uma chamada real ao HashiCorp
// Vault (ou equivalente), mantendo a mesma assinatura de metodo para nao
// quebrar quem consome este service.
@Injectable()
export class VaultService {
  async resolveSecret(credentialRef: string): Promise<string> {
    // Convencao do mock: credentialRef no formato "env:NOME_DA_VARIAVEL"
    // aponta para uma variavel de ambiente local. Qualquer outro formato
    // e rejeitado, para nao mascarar silenciosamente uma referencia mal
    // configurada.
    if (!credentialRef.startsWith('env:')) {
      throw new InternalServerErrorException(
        `credentialRef "${credentialRef}" fora do formato esperado do mock de Vault (env:NOME_VAR). ` +
          'Trocar VaultService.resolveSecret por integracao real antes de usar outro formato.',
      );
    }

    const varName = credentialRef.slice('env:'.length);
    const value = process.env[varName];

    if (!value) {
      throw new InternalServerErrorException(
        `Segredo referenciado por "${credentialRef}" nao encontrado (variavel de ambiente "${varName}" ausente)`,
      );
    }

    return value;
  }
}
