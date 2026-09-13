package centralizador.authorization

import rego.v1

# ---------------------------------------------------------------------------
# Politica de autorizacao do centralizador-controle.
#
# Hierarquia RBAC central x local (secao 4.3 da especificacao tecnica):
#   - O RBAC central (roles_permissions, vindo do centralizador-controle) e
#     a UNICA fonte de concessao de acesso.
#   - RBACs locais de modulo (local_restrictions) podem apenas RESTRINGIR
#     um acesso ja concedido centralmente -- nunca conceder algo que o
#     centralizador nao concedeu.
#   - Toda restricao local exige justificativa registrada (campo "reason"),
#     conforme secao 6 do adendo tecnico.
#
# Esta politica e ESTATICA e compartilhada por todos os tenants -- o que
# varia por tenant/versao e o "data.json" (roles_permissions e
# local_restrictions), publicado pelo OPAL a partir do PolicyBundle gerado
# pelo centralizador-controle. Nao se gera um .rego por tenant.
# ---------------------------------------------------------------------------

default allow := false

allow if {
	central_grant
	not locally_restricted
}

# Concessao central: alguma role do usuario tem uma permissao que bate com
# o modulo, recurso e acao pedidos.
central_grant if {
	some role in input.user.roles
	some perm in data.roles_permissions[role]
	perm.module == input.module
	perm.resource == input.resource
	perm.action == input.action
}

# Restricao local: o modulo declarou uma excecao que bloqueia esse
# recurso/acao especifico, mesmo que o centralizador tenha concedido.
locally_restricted if {
	some restriction in data.local_restrictions[input.module]
	restriction.resource == input.resource
	restriction.action == input.action
}

# Motivo da decisao, para auditoria/depuracao no lado do modulo (nao
# substitui o audit log append-only do centralizador-controle, que registra
# a criacao da restricao em si).
decision_reason := "central_grant_and_no_local_restriction" if allow

decision_reason := "no_central_grant" if {
	not allow
	not central_grant
}

decision_reason := "locally_restricted" if {
	not allow
	central_grant
	locally_restricted
}
