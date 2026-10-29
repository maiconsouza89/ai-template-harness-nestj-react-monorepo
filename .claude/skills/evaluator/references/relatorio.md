# avaliacao.md

Forma fixa de `docs/features/<pasta>/avaliacao.md`. Um arquivo por feature, sobrescrito a cada avaliação e versionado: o histórico é o do git, e o PR leva a última avaliação como evidência. Não mude títulos nem ordem: a `/fix-runner`, a `/implement-and-evaluate` e o `make check-eval` leem esta forma, e o diff entre duas avaliações só é útil se ela não muda.

Seção sem conteúdo fica com a linha `Nenhum.`, para o arquivo ter sempre as mesmas seções. Sem travessão "—" e sem comentário HTML.

## Sumário

1. Modelo
2. Notas para quem escreve
3. Projeção no chat

## Modelo

````markdown
# Avaliação: <RF-NNN Nome | fundação>

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: <2026-10-27T17-32-04Z>
- Branch: <branch>
- Commit: <sha curto do HEAD avaliado>
- Status: <limpo | reprovado | reprovado no gate <nome> | pendente | abortado no passo <N> | abortado no item <ID>: <motivo>>
- Itens: <P> passou, <F> falhou, <B> bloqueado, <M> manual, <S> pulado, de <total>
- Critérios: <V> verificado, <X> reprovado, <U> indeterminado, de <total>
- Filtros: <nenhum | "só API" ...>

> A maioria dos itens falha com <padrão>; a implementação pode não estar no lugar.

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| <texto literal, igual ao manifesto do contrato> | ✓ verificado | API-SAUDE-01, CLI-BANCO-02 |
| <texto literal> | ✗ reprovado | API-AUTH-03 (falhou: <motivo em uma linha>) |
| <texto literal> | ⊘ indeterminado | UI-PAINEL-02 (manual), WRK-FALHA-01 (bloqueado: <motivo>) |

## Gates de qualidade

- ✓ check: `make check`, código 0
- ✗ build: `make build`, código 2: <resumo do erro em uma linha>
- não rodou: <nome>, a avaliação parou antes

## Pré-requisitos

### Serviços em execução
- ✓ <serviço>: <url>, saúde <rota> respondeu <status>
- ✗ <serviço>: <motivo>

### Estado persistido
- ✓ `<handle>`: criado por <mecanismo>; conferido: <atributos>
- ✗ `<handle>`: <motivo>

### Entradas estáticas
- ✓ `<caminho>`: <ferramenta>: <resultado>
- ✗ `<caminho>`: <motivo>

### Configuração
- ✓ <chave>: <valor em vigor> (o contrato pede <sentido>)
- ✗ <chave>: <motivo>

### Dependências externas
- ✓ <dependência>: <como foi simulada ou versão>
- ✗ <dependência>: <motivo>

## Itens

### API HTTP

#### API-AUTH-03 *
- Veredito: falhou
- Dono: código
- ✓ a resposta é 200 | esperado 200, observado 200
- ✗ o corpo traz `aal` igual a `aal2` | esperado `aal2`, observado `aal1`
  - causa: <uma linha ancorada na evidência | não determinada; veja a evidência>
- `*` <bullet> | interpretado como: <o que foi conferido> | observado <O> | passou

<details>
<summary>Evidência</summary>

```
<requisição e resposta cortadas no que importa; consultas e resultados; saída de comando; trecho do DOM; caminho do screenshot>
```

</details>

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Instalar dependências | 5 | `package.json` |
| Banco efêmero e migração | 3 | spec da fundação, Convenções |
| Estado persistido | 3 | factories em `<caminho>` |
| Limpeza entre itens | 3 | `<helper>` |
| Cliente HTTP | 6 | default da stack |
| Navegador | 5 | `<ferramenta do projeto>` |

## Limpeza e ambiente

- Sobras removidas: <banco, pasta, PIDs> | Nenhuma.
- Derrubada: completa | <aviso>

## Avisos

- <o que não bloqueou e precisa de atenção: declaração sem uso, mecanismo assumido por default>

## Motivo do aborto

<só com status abortado ou reprovado no gate: em que passo, o que falhou, o que chegou a rodar e o que não rodou; num gate, o comando, o código e as primeiras 30 a 50 linhas do erro dentro de <details>>
````

## Notas para quem escreve

- Os itens aparecem todos, agrupados por superfície na ordem Serviço, API HTTP, CLI, Worker, Evento, UI, E2E, e na ordem do contrato dentro de cada uma. Não reordene por veredito.
- O `*` no título do item aparece quando pelo menos um bullet foi interpretado; o mesmo `*` marca o bullet.
- Evidência sempre dentro de `<details>` e cortada no que sustenta os bullets.
- A primeira coluna de Critérios é o texto literal do manifesto: o `make check-eval` compara com o contrato e avisa quando a avaliação ficou para trás.
- `Commit` é o HEAD avaliado; mudanças fora de commit no momento da avaliação vão em Avisos ("avaliado com N arquivos fora de commit").
- `Dono` só aparece em item `falhou` ou `bloqueado`, logo abaixo do Veredito, com um dos quatro valores do Passo 4 da skill. O `make check-eval` recusa item reprovado sem ele.
- Valor de segredo na evidência sai mascarado, mesmo sendo de teste (`sb_secret_<mascarado>`, `eyJ<mascarado>`): o `avaliacao.md` é versionado, e o gitleaks do `make check` varre o histórico e trata o valor como vazamento.

## Projeção no chat

Só isto, nesta ordem: o título, as linhas de Status, Itens e Critérios, a linha de alerta quando houver, cada critério `✗` ou `⊘` em uma linha, cada item `falhou` ou `bloqueado` em uma linha (ID, dono e causa: `API-AUTH-03 (código): <causa>`), o que mudou no roadmap e o caminho do `avaliacao.md`. O resto fica no arquivo.
