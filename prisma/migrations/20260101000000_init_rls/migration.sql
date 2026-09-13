-- ---------------------------------------------------------------------------
-- Row-Level Security por tenant — centralizador-controle
--
-- Aplicar como migration SQL manual do Prisma (prisma/migrations/<timestamp>_rls/
-- migration.sql), pois o Prisma Client não gerencia RLS diretamente.
--
-- Pré-requisito: a API deve setar, a cada requisição/transação, a variável de
-- sessão abaixo com o tenant do usuário autenticado (extraído do claim
-- tenant_id do token emitido pelo Keycloak):
--
--   SET LOCAL app.current_tenant_id = '<uuid-do-tenant>';
--
-- Isso deve ser feito dentro da mesma transação da query, nunca em uma
-- conexão compartilhada sem isolamento (risco de vazamento entre tenants em
-- pools de conexão mal configurados).
-- ---------------------------------------------------------------------------

-- Tabelas com isolamento por tenant (todas as que carregam tenant_id)
-- Module e ModuleScope ficam de fora: são catálogo global da plataforma.

DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'roles',
    'permissions',
    'role_permissions', -- via join com roles/permissions, ver política composta abaixo
    'profiles',
    'profile_roles',    -- via join, ver política composta abaixo
    'integrations',
    'profile_exports',
    'ingested_records',
    'audit_logs',
    'policy_bundles',
    'local_exceptions'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t); -- vale até para o dono da tabela
  END LOOP;
END $$;

-- Tabelas com coluna tenant_id direta: política simples de igualdade.
CREATE POLICY tenant_isolation ON roles
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON permissions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON profiles
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON integrations
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON profile_exports
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON ingested_records
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON policy_bundles
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

CREATE POLICY tenant_isolation ON local_exceptions
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Tabelas de junção sem tenant_id próprio: isolamento via join com a tabela
-- pai que já carrega tenant_id.
CREATE POLICY tenant_isolation ON role_permissions
  USING (
    role_id IN (
      SELECT id FROM roles
      WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

CREATE POLICY tenant_isolation ON profile_roles
  USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid
    )
  );

-- ---------------------------------------------------------------------------
-- Papel de superadministração (cross-tenant) — seção 3.2 da especificação.
-- Restrito à equipe da plataforma, deve ser um role de banco separado (nunca
-- o mesmo usado pela aplicação), e todo acesso sob esse papel é auditado
-- separadamente (fora do escopo deste RLS, ver camada de aplicação).
-- ---------------------------------------------------------------------------

-- Exemplo de bypass controlado para o papel de superadmin (usar com cautela,
-- e SEMPRE combinado com log de auditoria explícito na camada de aplicação):
--
-- ALTER TABLE roles FORCE ROW LEVEL SECURITY; -- já habilitado acima
-- CREATE POLICY superadmin_bypass ON roles
--   USING (current_setting('app.is_superadmin', true)::boolean = true);
--
-- Avaliar com o time de segurança se esse bypass deve existir a nível de
-- banco ou se o acesso cross-tenant do superadmin deve sempre passar por uma
-- rota de aplicação separada, sem tocar o RLS diretamente.
