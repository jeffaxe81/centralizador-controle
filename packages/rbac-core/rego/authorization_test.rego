package centralizador.authorization

import rego.v1

# Dados de teste: papel "atendente_despacho" concede leitura de "ticket" no
# modulo "despacho". Sem nenhuma restricao local ainda.
mock_data_sem_restricao := {
	"roles_permissions": {"atendente_despacho": [{
		"module": "despacho",
		"resource": "ticket",
		"action": "read",
	}]},
	"local_restrictions": {},
}

# Caso 1: concessao central existe e nao ha restricao local -> permite.
test_allow_quando_ha_concessao_central_sem_restricao_local if {
	allow with input as {
		"user": {"roles": ["atendente_despacho"]},
		"module": "despacho",
		"resource": "ticket",
		"action": "read",
	}
		with data.roles_permissions as mock_data_sem_restricao.roles_permissions
		with data.local_restrictions as mock_data_sem_restricao.local_restrictions
}

# Caso 2: usuario nao tem nenhuma role com a permissao pedida -> nega,
# mesmo que o modulo nao tenha nenhuma restricao local (RBAC local nunca
# concede o que o centralizador nao concedeu).
test_deny_quando_nao_ha_concessao_central if {
	not allow with input as {
		"user": {"roles": ["atendente_despacho"]},
		"module": "despacho",
		"resource": "ticket",
		"action": "delete",
	}
		with data.roles_permissions as mock_data_sem_restricao.roles_permissions
		with data.local_restrictions as mock_data_sem_restricao.local_restrictions
}

# Caso 3: concessao central existe, mas o modulo registrou uma restricao
# local (com justificativa) para esse recurso/acao -> nega.
mock_data_com_restricao := {
	"roles_permissions": mock_data_sem_restricao.roles_permissions,
	"local_restrictions": {"despacho": [{
		"resource": "ticket",
		"action": "read",
		"reason": "exececao operacional aprovada em 2026-09-10 por admin-2",
	}]},
}

test_deny_quando_ha_restricao_local_mesmo_com_concessao_central if {
	not allow with input as {
		"user": {"roles": ["atendente_despacho"]},
		"module": "despacho",
		"resource": "ticket",
		"action": "read",
	}
		with data.roles_permissions as mock_data_com_restricao.roles_permissions
		with data.local_restrictions as mock_data_com_restricao.local_restrictions
}

# Caso 4: a mesma restricao local NAO afeta um recurso/acao diferente --
# confirma que a restricao e escopada, nao um bloqueio geral do modulo.
test_allow_para_recurso_diferente_nao_coberto_pela_restricao_local if {
	allow with input as {
		"user": {"roles": ["atendente_despacho"]},
		"module": "despacho",
		"resource": "ticket",
		"action": "read",
	}
		with data.roles_permissions as {"atendente_despacho": [
			{"module": "despacho", "resource": "ticket", "action": "read"},
			{"module": "despacho", "resource": "contato", "action": "read"},
		]}
		with data.local_restrictions as {"despacho": [{
			"resource": "contato",
			"action": "read",
			"reason": "outra excecao, nao relacionada a ticket",
		}]}
}
