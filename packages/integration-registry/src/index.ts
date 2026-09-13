// Driver genérico configurável (REST/JSON com mapeamento simples de campos)
// e o contrato de adapter dedicado para casos fora desse escopo — decisão
// registrada no adendo técnico, seção 3.

export interface FieldMapping {
  [targetField: string]: string; // caminho no payload de origem, ex.: "user.email"
}

export interface GenericRestAdapterConfig {
  baseUrl: string;
  credentialRef: string; // referência ao segredo no vault — nunca a credencial em si
  fieldMapping: FieldMapping;
}

// Stub inicial — implementação real entra no Épico 5 (Integration Registry).
export async function exportProfileViaGenericRestAdapter(
  config: GenericRestAdapterConfig,
  payload: Record<string, unknown>,
): Promise<{ status: 'PENDING' }> {
  return { status: 'PENDING' };
}
