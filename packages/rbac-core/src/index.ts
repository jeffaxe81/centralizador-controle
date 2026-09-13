// Compilador Role/Permission -> dados consumidos pela politica Rego
// estatica (ver rego/authorization.rego), publicados pelo OPAL a cada
// mudanca no centralizador-controle.
//
// Descoberta da POC (validada com `opa test` e `opa eval`, ver
// rego/authorization_test.rego): a politica Rego em si e a MESMA para todos
// os tenants -- o que muda por tenant/versao e so o data.json
// (roles_permissions + local_restrictions). Por isso este compilador NAO
// gera Rego dinamicamente; ele so monta o "data.json" do PolicyBundle.
// O campo `regoSource` do PolicyBundle (schema.prisma) passa a guardar uma
// referencia de versao da politica estatica, nao um Rego gerado por tenant.

import type { RoleDTO, PermissionDTO } from '@centralizador-controle/shared';

export interface RolePermissionEntry {
  module: string;
  resource: string;
  action: string;
}

export interface LocalRestriction {
  resource: string;
  action: string;
  reason: string; // obrigatorio -- secao 6 do adendo: justificativa registrada
}

export interface CompiledDataBundle {
  tenantId: string;
  version: number;
  staticPolicyVersion: string; // versao do authorization.rego, nao gerado por tenant
  data: {
    roles_permissions: Record<string, RolePermissionEntry[]>;
    local_restrictions: Record<string, LocalRestriction[]>;
  };
}

const STATIC_POLICY_VERSION = '1.0.0';

// Junta Role + Permission (+ ModuleScope, resolvido a montante) no formato
// que a politica Rego espera em `data.roles_permissions`.
export function compileRolesPermissions(
  roles: RoleDTO[],
  permissionsByRole: Map<string, PermissionDTO[]>,
  moduleScopeResolver: (moduleScopeId: string) => { module: string; resource: string; action: string },
): Record<string, RolePermissionEntry[]> {
  const result: Record<string, RolePermissionEntry[]> = {};

  for (const role of roles) {
    const perms = permissionsByRole.get(role.id) ?? [];
    result[role.name] = perms.map((p) => {
      const scope = moduleScopeResolver(p.moduleScopeId);
      return { module: scope.module, resource: scope.resource, action: scope.action };
    });
  }

  return result;
}

export function compileDataBundle(
  tenantId: string,
  version: number,
  rolesPermissions: Record<string, RolePermissionEntry[]>,
  localRestrictions: Record<string, LocalRestriction[]>,
): CompiledDataBundle {
  // Toda entrada de local_restrictions PRECISA ter reason -- reforcado aqui
  // alem do audit log, para nao publicar uma restricao sem justificativa.
  for (const [module, restrictions] of Object.entries(localRestrictions)) {
    for (const r of restrictions) {
      if (!r.reason || r.reason.trim().length === 0) {
        throw new Error(
          `Restricao local em "${module}" para ${r.resource}/${r.action} sem justificativa registrada (secao 6 do adendo).`,
        );
      }
    }
  }

  return {
    tenantId,
    version,
    staticPolicyVersion: STATIC_POLICY_VERSION,
    data: { roles_permissions: rolesPermissions, local_restrictions: localRestrictions },
  };
}
