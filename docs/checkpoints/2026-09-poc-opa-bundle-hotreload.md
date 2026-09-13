# Checkpoint — POC: revogacao em tempo real via bundle do OPA

Data: 2026-09-13

## O que foi validado

1. `packages/rbac-core/rego/authorization.rego` — politica estatica da
   hierarquia RBAC central x local, com 4 testes automatizados
   (`opa test`), todos passando:
   - concessao central sem restricao local -> allow
   - nenhuma concessao central -> deny
   - concessao central + restricao local -> deny
   - restricao local escopada nao vaza para outro recurso -> allow

2. Hot-reload de dados sem reiniciar o OPA: subimos um OPA em modo
   servidor consumindo um bundle via HTTP (`opa run --server -c
   opa-config.yaml`), consultamos a decisao para um atendente lendo um
   ticket (`{"result":true}`), republicamos o bundle com a permissao
   revogada, e a mesma consulta — no mesmo processo OPA, sem restart —
   passou a retornar `{"result":false}` no ciclo de polling seguinte
   (2-3s). Log do OPA confirma dois novos ciclos de
   "Bundle loaded and activated successfully" apos a mudanca.

## Limitacao do ambiente de teste

Este sandbox nao tem acesso ao Docker Hub nem a um Redis, entao nao foi
possivel subir o OPAL server completo (que normalmente roda em
containers). O teste usou o mecanismo nativo de bundle polling do
proprio OPA como proxy do que o OPAL automatiza.

Diferenca esperada em producao com OPAL: a atualizacao deixa de depender
de polling (2-3s) e passa a ser push via WebSocket (pub/sub) — chega em
milissegundos. O mecanismo de fundo (recarregar sem reiniciar o
processo) e o mesmo que ja foi provado aqui.

## Achado que mudou o design

A politica Rego e ESTATICA e compartilhada entre tenants; so o
`data.json` varia por tenant/versao. `schema.prisma` (`PolicyBundle`) e
`packages/rbac-core/src/index.ts` ja foram atualizados para refletir
isso (`staticPolicyVersion` no lugar de um `regoSource` por tenant).

## Proximo passo

Spike exploratorio de dados do crm-vendas e Despachador (Epico 10),
avaliando Apache Syncope ou midPoint para a captura/conciliacao inicial.
