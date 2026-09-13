# Plano de spike — Épico 10 (captura inicial de crm-vendas e Despachador)

Status: proposto, aguardando execução pelo time interno (depende de acesso
a sistemas que este processo não tem).

## Objetivo

Responder, ANTES de comprometer o schema Prisma definitivo, se os dados de
permissão/perfil de crm-vendas e Despachador mapeiam de forma razoável para
o modelo `Role` / `Permission` / `Profile` do centralizador-controle, ou se
o modelo precisa mudar.

Isto é um spike exploratório, não a migração completa — o objetivo é
reduzir risco, não entregar a captura em produção.

## Escopo

- **crm-vendas**: papéis, perfis, permissões e privilégios do módulo de
  Identity & Access, e vínculos usuário-papel existentes.
- **Despachador (dispatch)**: papéis, perfis, permissões e privilégios
  equivalentes.

Fora de escopo neste spike: qualquer escrita nos sistemas de origem, e
qualquer migração real de usuários — é só leitura e análise.

## Acesso necessário (a levantar com os times donos de cada sistema)

- crm-vendas: acesso de leitura ao banco (ou à API de Identity & Access,
  se existir) em ambiente de homologação — nunca produção diretamente.
- Despachador: mesmo padrão — leitura em homologação.
- Um contato de negócio de cada lado (crm-vendas e Despacho) que conheça o
  significado real de cada papel/perfil, para a etapa de conciliação —
  isto não dá para fazer só olhando nomes de tabela.

## Passos

1. **Extração bruta** (script de leitura, sem transformação): listar todos
   os papéis, permissões, perfis e vínculos de cada sistema, exportando em
   JSON simples (um arquivo por sistema).
2. **Inventário de divergências**: montar uma planilha comparando os dois
   sistemas lado a lado — que conceitos existem só em um, que nomes
   parecem equivalentes mas podem não ser (ex.: "Operador Nível 1" no CRM
   vs. "Atendente Básico" no Despacho).
3. **Validação com o negócio**: sentar com os contatos de cada sistema e
   confirmar (ou refutar) as equivalências levantadas no inventário. Esta
   etapa é humana, não tem como automatizar.
4. **Proposta de mapeamento**: para cada papel/permissão confirmado,
   propor o `Role`/`Permission`/`ModuleScope` correspondente no
   centralizador-controle — incluindo os casos que NÃO mapeiam limpo
   (permissões compostas, papéis com múltiplos módulos, etc.) como uma
   lista separada de exceções a decidir.
5. **Checagem de dados sujos**: identificar, na extração bruta, papéis
   órfãos, usuários desativados sem limpeza, ou duplicatas óbvias — listar
   sem tentar corrigir neste spike.
6. **Relatório final do spike**: documento curto com o que foi encontrado,
   o que mapeia limpo, o que não mapeia (e por quê), e uma recomendação de
   ajuste (ou não) ao schema Prisma atual antes de seguir para os Épicos
   3-9.

## Ferramenta de apoio à conciliação

Conforme decidido, usar o motor de reconciliação do **Apache Syncope** (ou
midPoint) para a etapa 1 (extração) e como referência de como eles
resolvem a etapa 2 (inventário de divergências) — não é necessário rodar
o Syncope completo neste spike; vale usar o próprio conector/CLI dele para
testar a extração antes de decidir se ele entra como peça definitiva do
Épico 10.

## Critério de sucesso do spike

- Pelo menos 80% dos papéis/permissões de cada sistema mapeiam para o
  modelo atual sem mudança de schema.
- Toda divergência que exigiria mudança de schema está documentada com
  exemplo concreto (não hipotético).
- Times donos de crm-vendas e Despacho validaram o inventário de
  equivalências — não é uma conclusão só técnica.

## Estimativa de esforço

Depende do volume de dados e da disponibilidade dos contatos de negócio —
não dá para estimar prazo sem uma primeira olhada no volume real de
papéis/permissões de cada sistema. Recomendação: rodar a etapa 1
(extração bruta) primeiro, isoladamente, e só então estimar o resto com
números reais em mãos.
