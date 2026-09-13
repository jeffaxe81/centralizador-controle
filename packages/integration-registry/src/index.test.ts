import { exportProfileViaGenericRestAdapter, GenericRestAdapterConfig } from './index';

describe('exportProfileViaGenericRestAdapter', () => {
  it('retorna status PENDING (stub -- implementacao real e no Epico 5/api)', async () => {
    const config: GenericRestAdapterConfig = {
      baseUrl: 'https://example.com/api',
      credentialRef: 'env:EXEMPLO',
      fieldMapping: { name: 'profile.name' },
    };
    const result = await exportProfileViaGenericRestAdapter(config, { name: 'Perfil X' });
    expect(result.status).toBe('PENDING');
  });
});
