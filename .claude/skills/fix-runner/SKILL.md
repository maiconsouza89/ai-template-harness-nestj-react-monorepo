---
name: fix-runner
description: Correção dirigida de um RF-NNN (ou da fundação) em três modos. Avaliação - corrige os itens que falharam ou ficaram bloqueados em `docs/features/RF-NNN-nome/avaliacao.md`, a partir do esperado, do observado e da evidência. Conflito - resolve conflitos de merge no branch da feature, com spec e contrato decidindo o que vale. Achado - corrige um problema que o contrato não cobre (revisão de segurança, CI vermelha), reproduzindo antes e deixando um teste que falha no código antigo. Valida pelo `Makefile` e faz um commit com autorização. Não edita spec, plano nem contrato e não dá veredito; depois dela vem `/evaluator`. Use sempre que o usuário quiser corrigir o que a avaliação reprovou ("corrige o que falhou no RF-003", "arruma os itens bloqueados"), resolver conflito de merge num branch de feature ("o PR 42 tem conflito") ou corrigir um achado fora do contrato ("a revisão de segurança apontou X", "a CI quebrou no PR"), mesmo sem dizer fix-runner.
---

# Fix Runner

Uma passada de correção, curta e mirada, sobre uma feature que já foi implementada. Ela não refaz fases do plano nem verifica se a correção funcionou: o veredito é da próxima `/evaluator`. Mexe em código, testes, seeds, fixtures e configuração; spec, plano, contrato, `avaliacao.md` e as pastas de outras features são só leitura.

| Entrada | Modo |
|---|---|
| Alvo (`RF-003`, `fundação`, pasta) com `avaliacao.md` reprovado, opcionalmente os IDs ("só API-AUTH-03") | **Avaliação** |
| Conflito de merge no working tree, ou um PR (`PR 42`, URL, nome do branch) | **Conflito** |
| Um problema que nenhum item do contrato cobre, com a origem: revisão de segurança automática, log de CI vermelha, regressão vista por quem orquestra | **Achado** |

Pedido que mistura os modos: pergunte qual primeiro.

Em todos, a skill termina em **um** commit, feito só com autorização. Chamada pela `/implement-and-evaluate`, a autorização já veio no prompt. Chamada direto, pergunte uma vez no começo com `AskUserQuestion` ("Posso commitar a correção quando a validação passar?", sim recomendado): o `CLAUDE.md` não deixa agente commitar sem autorização explícita, e ela vale só para esta execução. Sem autorização, a correção fica no working tree.

## Modo avaliação

### 1. Carregar

- `avaliacao.md` da pasta: status, e para cada item `falhou` ou `bloqueado` (todos, ou os pedidos), os bullets `✗` com esperado, observado, causa e a evidência dentro de `<details>`. Item `manual` não se corrige aqui: é revisão de pessoa. Se só sobraram itens `manual`, pare e diga isso.
- Status `abortado no passo N` ou `reprovado no gate <nome>`: não há item para mirar; o alvo é a seção "Motivo do aborto" (migração quebrada, serviço que não sobe, gate vermelho).
- `contract.md`: os itens visados inteiros, o `Dado comum` da capacidade e os Pré-requisitos que eles consomem. **O contrato manda no comportamento observável.**
- `spec.md`: só as seções que os itens tocam (Componentes, Contratos de interface, Modelo de dados, Tratamento de erros). **A spec manda na estrutura.** Plano não se lê: fase não importa para corrigir.
- Convenções: "Convenções para as features" de `docs/features/fundacao/spec.md` e o `CLAUDE.md`.

Se o `Commit` do `avaliacao.md` não é o HEAD, avise que parte das falhas pode já ter sido resolvida e siga.

### 2. Diagnosticar

A superfície aponta a camada provável; a evidência decide:

| Superfície | Onde costuma estar |
|---|---|
| Serviço, Worker, Evento | regra de domínio, handler de fila, publicação ou consumo |
| API HTTP | rota, validação, mapeamento, acesso a dados, filtro de erro |
| CLI | o script ou comando |
| UI | tela, formulário, cliente da API, texto |
| E2E | a costura entre as superfícies; corrija a de baixo primeiro |

Leitura rápida da evidência: esperado 201 e observado 500 é exceção em tempo de execução (o corpo e o log dizem onde); observado 404 é rota ausente ou caminho errado; erro de transporte é serviço que não subiu (procure exceção no boot).

Item `bloqueado` quase sempre aponta um pré-requisito: seed ou factory que não cria o handle com os atributos declarados, fixture ausente ou sem a propriedade (caminho exato do contrato), chave de configuração ausente ou com valor incompatível no arquivo de teste da convenção. Vários itens bloqueados pelo mesmo pré-requisito se resolvem com uma correção só.

### 3. Corrigir

A menor mudança que plausivelmente deixa os itens verdes, seguindo as convenções do projeto por construção, não remendada depois de o gate reclamar.

- **Testes**: corrija o teste que afirma uma forma antiga que o contrato desmente. Acrescente teste só quando a Estratégia de testes da spec o previa e ele falta; as asserções canônicas são os itens do contrato, exercitados pela `/evaluator`.
- **Migração**: mudança de esquema vira migração nova pelo comando não interativo da convenção. Se o projeto só tem comando interativo, edite a fonte do esquema e registre o comando para a pessoa rodar.
- **Stub só em teste**, nunca em código de produção.
- **Se a correção exigiria mudar spec, plano ou contrato** (o item pede o que a spec proíbe, o critério mudou), pare com status `abortado`: isso é revisão do trio pela `/spec-writer`, não correção. Tecnologia nova sem ADR: pare e aponte a `/adr-writer`.
- **Nada a mudar** (a falha parece intermitente): status `abortado`, motivo "nenhuma mudança identificada; a falha pode ser intermitente. Rode /evaluator de novo sem correção".

### 4. Validar

Rode os gates do contrato (`## Gates de qualidade`, em geral `make check` e `make build`) e, se a correção tocou algo que eles não cobrem, o alvo do `Makefile` que cobre (`make test`). Até 3 tentativas no total: leia a falha, ajuste e rode de novo. Falha que já existia antes desta passada, em código que ela não tocou, não conta como tentativa e não bloqueia o commit; registre com a evidência. Esgotou com vermelho: status `validação falhou`, sem commit, working tree como está, para inspeção.

### 5. Commit

Só os arquivos desta passada, pelo nome (nunca `git add -A` nem `.`), sem `--no-verify` e sem `--amend` em commit anterior. Formato do `CONTRIBUTING.md`; o hook confere o cabeçalho:

```
fix(<escopo>): corrige <o que estava errado, em poucas palavras>

Itens da avaliação: API-AUTH-03, WRK-FALHA-01.
<causa encontrada e o que mudou, em uma ou duas frases>

Refs: <RF-NNN | fundacao>
Fix-Cycle: <N>
```

`<N>` é o ciclo que a `/implement-and-evaluate` passou; chamada direta, conte os commits com `Fix-Cycle` para o mesmo `Refs` neste branch e some 1.

## Modo conflito

1. **Com PR.** `gh pr view <ref> --json baseRefName,headRefName,state,title,body,url`. Pare se o `gh` não está autenticado, se o PR não está aberto, se o branch atual não é o `headRefName` ("o PR é de <X>; o branch atual é <Y>; não troco de branch") ou se o working tree tem alterações. Depois, `git fetch origin <base>` e `git merge origin/<base>`. Merge limpo vai direto ao commit.
2. **Sem PR**, o merge já está no working tree: confira `.git/MERGE_HEAD`. A lista que vale é `git diff --name-only --diff-filter=U`.
3. **Contexto.** Os itens do contrato e as seções da spec das superfícies que os arquivos em conflito tocam, e, com PR, o título e a descrição dele (dizem a intenção do lado que entra).
4. **Resolver** cada arquivo, nesta ordem de regra:
   1. o que spec ou contrato fixam (assinatura, rota, coluna) decide;
   2. acréscimos dos dois lados sem sobreposição (imports, rotas, campos, migrações com nomes diferentes) se somam, sem duplicar;
   3. mudança conflitante na mesma linha que o contrato não fixa: fica o lado do branch da feature, registrado no corpo do commit;
   4. intenções incompatíveis que nada fixa: pare com `abortado` ("conflito sem solução em <arquivo>: <uma linha>"). Meia resolução é pior que nenhuma.
5. `git add` de cada arquivo resolvido e valide como no Modo avaliação, passo 4. Vermelho depois de 3 tentativas: `validação falhou`, merge ainda em andamento para a pessoa ver.
6. **Commit** de merge com a mensagem padrão do git (`Merge remote-tracking branch 'origin/main' into feat/...`), que o hook aceita, e no corpo a lista de arquivos resolvidos e as escolhas da regra 3.

## Modo achado

Para o que a avaliação não pega porque o contrato não cobre: a revisão de segurança que aponta 401 sem limite por IP, o job da CI que falha num passo que só roda lá. Sem este modo, a correção sai de um subagente avulso, sem as regras desta skill e com o rodapé de outra coisa.

1. **Carregar.** A entrada traz a origem, a descrição, os arquivos e, quando houver, a regra da spec que o achado viola (seção e linha). Log de CI vem cortado nas linhas do erro; peça o resto só se a causa não aparecer nelas. Leia a spec só nas seções que o achado toca e o contrato só nos itens da mesma superfície, para não quebrar o que já passa.
2. **Confirmar.** Reproduza antes de corrigir: a requisição que escapa do limite, o comando que falha. Achado que não se reproduz e não tem evidência: status `abortado`, motivo "achado não reproduzido", com o que foi tentado.
3. **Corrigir e validar** como no Modo avaliação, passos 3 e 4. Toda correção de achado vem com um teste que falha no código antigo, no nível que a Estratégia de testes da spec indica: o contrato não cobre o caso, então é esse teste que impede a volta.
4. **Commit** no formato do Modo avaliação, com `Achado: <origem em uma linha>` no lugar de `Itens da avaliação:` e `Fix-Cycle: <N>` (0 quando a implementação ainda não passou por avaliação).
5. **Lacuna do contrato.** Em Pendências, diga qual regra da spec ficou sem item, para a `/spec-writer` cobrir na próxima Revisão.

## Relatório

```
Fix Runner: <RF-NNN | fundação>, ciclo <N>, modo <avaliação | conflito | achado>
Status: corrigido | validação falhou | abortado
Itens visados: <IDs>                 (avaliação)
Achado: <origem: descrição curta>    (achado)
PR: <ref> (<head> ← <base>)          (conflito com PR)
Arquivos em conflito: <lista>        (conflito)
Arquivos alterados: <lista>
Commit: <sha> | nenhum (<motivo>)
Validação: <comando: resultado, tentativa N de 3>
Falhas anteriores: <teste: evidência>
Pendências: <comando de migração para a pessoa, revisão do trio, ADR>
Motivo do aborto: <se houver>
Próximo passo: /evaluator <alvo>
```

Sem travessão "—" no relatório nem no commit.
