import { compileDataBundle, compileRolesPermissions } from './index';
import type { RoleDTO, PermissionDTO } from '@centralizador-controle/shared';

describe('compileDataBundle', () => {
  it('compila com sucesso quando nao ha restricoes locais', () => {
    const bundle = compileDataBundle('tenant-1', 1, { atendente: [{ module: 'despacho', resource: 'ticket', action: 'read' }] }, {});
    expect(bundle.tenantId).toBe('tenant-1');
    expect(bundle.version).toBe(1);
    expect(bundle.data.roles_permissions.atendente).toHaveLength(1);
    expect(bundle.data.local_restrictions).toEqual({});
  });

  it('compila com sucesso quando a restricao local tem justificativa', () => {
    const bundle = compileDataBundle(
      'tenant-1',
      2,
      {},
      { despacho: [{ resource: 'ticket', action: 'delete', reason: 'aprovado por admin-3 em 2026-09-10' }] },
    );
    expect(bundle.data.local_restrictions.despacho).toHaveLength(1);
  });

  it('rejeita restricao local sem justificativa (reason vazio)', () => {
    expect(() =>
      compileDataBundle('tenant-1', 1, {}, { despacho: [{ resource: 'ticket', action: 'delete', reason: '' }] }),
    ).toThrow(/sem justificativa/);
  });

  it('rejeita restricao local com reason so de espacos em branco', () => {
    expect(() =>
      compileDataBundle('tenant-1', 1, {}, { despacho: [{ resource: 'ticket', action: 'delete', reason: '   ' }] }),
    ).toThrow(/sem justificativa/);
  });

  it('inclui a versao da politica estatica no bundle', () => {
    const bundle = compileDataBundle('tenant-1', 1, {}, {});
    expect(bundle.staticPolicyVersion).toBe('1.0.0');
  });
});

describe('compileRolesPermissions', () => {
  it('resolve o moduleScope de cada permissao da role via o resolver', () => {
    const roles: RoleDTO[] = [{ id: 'role-1', tenantId: 't1', name: 'atendente', version: 1 }];
    const permissionsByRole = new Map<string, PermissionDTO[]>([
      ['role-1', [{ id: 'perm-1', tenantId: 't1', moduleScopeId: 'scope-1', scope: 'MODULE', version: 1 }]],
    ]);

    const result = compileRolesPermissions(roles, permissionsByRole, () => ({
      module: 'despacho',
      resource: 'ticket',
      action: 'read',
    }));

    expect(result.atendente).toEqual([{ module: 'despacho', resource: 'ticket', action: 'read' }]);
  });

  it('retorna array vazio para role sem nenhuma permissao mapeada', () => {
    const roles: RoleDTO[] = [{ id: 'role-2', tenantId: 't1', name: 'sem_permissao', version: 1 }];
    const result = compileRolesPermissions(roles, new Map(), () => ({ module: 'x', resource: 'y', action: 'z' }));
    expect(result.sem_permissao).toEqual([]);
  });
});
