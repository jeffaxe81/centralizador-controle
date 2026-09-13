// DTOs e tipos compartilhados entre apps/api, apps/web e os demais packages.
// Mantém em sincronia com o schema.prisma (prisma/schema.prisma).

export type Action = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE';
export type PermissionScope = 'GLOBAL' | 'ORGANIZATION' | 'MODULE';

export interface RoleDTO {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  version: number;
}

export interface PermissionDTO {
  id: string;
  tenantId: string;
  moduleScopeId: string;
  scope: PermissionScope;
  version: number;
}

export interface ProfileDTO {
  id: string;
  tenantId: string;
  name: string;
  roleIds: string[];
}
