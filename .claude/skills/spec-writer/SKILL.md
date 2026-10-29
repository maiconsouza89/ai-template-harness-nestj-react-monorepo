---
name: spec-writer
description: Gera, para um RF-NNN do PRD, os três documentos de implementação em `docs/features/RF-NNN-nome/`, em português - `spec.md` (desenho técnico sobre os componentes do HLD e a stack dos ADRs aceitos), `plan.md` (fases e passos) e `contract.md` (promessa testável em dado/quando/então, com manifesto que cobre cada critério de aceitação do PRD pelo texto literal). Gera também a fundação (`docs/features/fundacao/`) quando o projeto não tem base, roda em lote para uma onda do roadmap, marca o RF como em andamento e, a pedido, abre issue no GitHub. Use sempre que o usuário quiser especificar, detalhar ou planejar a implementação de um requisito ("spec do RF-003", "plano de implementação", "contrato de teste", "critérios testáveis", "quebra o RF em tarefas", "prepara a onda 2"), mesmo sem dizer spec; quando o PRD e o HLD estiverem prontos e ele perguntar o que vem antes do código; ou quando o PRD mudar e as specs em `docs/features/` ficarem para trás.
---

# Spec Writer

Para cada requisito do PRD, a skill responde três perguntas para quem vai implementar e para quem vai conferir: **como construir este RF sobre a arquitetura que já existe (spec), em que ordem (plano) e o que precisa ser verdade para ele estar pronto (contrato)**.

Ela fica depois de tudo que este repositório já decidiu. O PRD (`/prd-writer`) diz o quê e do que cada RF depende; o HLD (`/hld-writer`) diz em que componentes e por que interfaces; os ADRs (`/adr-writer`) dizem com que tecnologia. A spec **não reabre nada disso**: cita o RF pelo número, os componentes pelo nome do HLD e a tecnologia pelo ADR, e decide só o que sobra (endpoint, coluna, arquivo, caso de borda). Quando sobrar uma escolha de tecnologia que nenhum ADR cobre, ela vira pergunta e entra em "Pendentes de ADR": spec não é lugar de escolher stack.

O contrato é irmão da spec, não filho. Os dois saem da mesma rodada, mas o contrato nasce dos critérios de aceitação do PRD e não das escolhas da spec, para que refatorar a implementação nunca mude o que significa "pronto".

## Modos

| Situação | Modo |
|---|---|
| Um RF, com alguém para responder | **Entrevista** |
| Um RF, pedido "sem perguntas" ou rodando sem interação | **Direto** |
| Vários RFs ou uma onda (`onda 2`, `RF-002 RF-003`) | **Lote**: leia `references/lote.md` |
| A pasta do RF já tem os três arquivos | **Revisão** |
| Pedido da fundação, ou projeto sem base e o usuário aceitou gerá-la | **Fundação**: leia `references/fundacao.md` |

Em qualquer modo, leia antes de escrever: `assets/spec-template.md`, `assets/plan-template.md`, `assets/contract-template.md`, `references/contrato.md` (como preencher o contrato) e `references/entrevista.md` (descoberta no código, o que perguntar, defaults e a checagem de conteúdo). A flag `criar-issue` pode vir em qualquer lugar do pedido; ver `references/issue.md`.

## Passo 0: alvo e contexto

Na raiz do repositório (`git rev-parse --show-toplevel`):

1. **O PRD é obrigatório.** Sem `docs/product/prd.md`, pare e diga que o `/prd-writer` gera um. Uma spec sem PRD não tem critério para cobrir e vira opinião. Sem HLD, siga e diga em uma linha que o `/hld-writer` desenha os componentes; a spec então se apoia nos ADRs e no código, e marca como hipótese cada componente que nomear.
2. **Resolva o alvo.** O usuário pode dizer `RF-003`, `3`, o nome ou parte dele. Nome ambíguo: pergunte qual. RF inexistente: liste os RFs (`contexto.py estado`).
3. **Leia o contexto pronto**: `python3 <skill-dir>/scripts/contexto.py rf RF-NNN`. Ele imprime a onda, o status no roadmap, o bloco completo do RF, as dependências diretas com status, o **fecho de dependências** (limite do que o contrato pode exigir), os dependentes, a linha do RF na rastreabilidade do HLD, a pasta de destino e, separados, os critérios que entram no manifesto. Use isso em vez de recortar o PRD à mão: é a mesma conta que o validador vai fazer.
4. **Confira a prontidão** e, para cada caso, pergunte se segue (no Direto, siga e registre no relatório):
   - dependência direta que não está `feito` no roadmap: "RF-010 depende de RF-008, que está pendente. A spec sai, mas a interface que ela consome ainda não existe no código. Seguir?";
   - RF `bloqueado` no roadmap: cite o motivo da Observação;
   - fundação: ver a tabela de `references/fundacao.md`. Num projeto sem base, recomende gerar a fundação antes.
5. **Spec existente.** Se `docs/features/RF-NNN-*/` já tem os três arquivos, isto é Revisão. Com um ou dois, a pasta está incompleta e os três são regenerados juntos.

## Passo 1: descoberta e entendimento

Faça a descoberta no código descrita em `references/entrevista.md` seção 1, leia os ADRs aceitos (pelo front-matter, não pelo `index.md`) e as specs dos RFs do fecho. Depois diga, em até seis linhas, o que entendeu:

```
RF-010 Contratar anúncio direto (onda 4, alta)
Resumo técnico: [1 a 2 frases do fluxo principal sobre os componentes do HLD]
Componentes (HLD): Comercial, Financeiro, Criativos e moderação; API do painel e Webhook de pagamento
Stack (ADRs): NestJS (0002), PostgreSQL (0003), Asaas (0007), BullMQ (0008)
Padrões do código: [os da descoberta, ou "sem código: convenções da fundação"]
Manifesto: 4 critérios próprios e 1 de integração (RF-008 → RF-010)
```

## Passo 2: entrevista

Só no modo Entrevista. Vá pelos blocos de `references/entrevista.md` seção 3, pulando o que o PRD, o HLD, os ADRs, o código ou as specs anteriores já respondem. No Direto, aplique os defaults da seção 4 e marque cada um `(hipótese)`.

### Como perguntar

O usuário decide; você recomenda. Vale para toda pergunta da skill:

- **Toda pergunta vem com alternativas e uma recomendação.** Use `AskUserQuestion` com 2 a 4 opções concretas, a recomendada primeiro com "(Recomendado)" no rótulo e, na descrição de cada uma, o que implica e o que custa. A recomendação diz o porquê ligado ao material (o RF, a meta do HLD, o padrão do código), não só "é o padrão".
- **Recomendação técnica cita a fonte.** Antes de recomendar biblioteca, padrão da stack, formato de contrato ou mecanismo de verificação, confira a documentação oficial (pelo Context7 ou pela página do projeto) e ponha na descrição de cada opção o que ela recomenda, com a página. Quando as fontes divergem ou não cobrem o ponto, a opção diz isso. Afirmação anterior que a doc desmente se corrige em voz alta. Prós e contras sem fonte não bastam para a pessoa decidir.
- **Blocos, não interrogatório.** Até 4 perguntas por chamada, do mesmo bloco. Uma por vez arrasta a conversa; trinta de uma vez ninguém lê.
- **A pergunta se explica sozinha.** Quem responde vê a caixa, não o texto acima. Nada de "a proposta acima" ou "o item 2": diga o endpoint, a coluna, o componente.
- **Decisão é do usuário, mesmo com opinião forte.** Onde há mais de um caminho razoável, pergunte em vez de decidir e pedir "confere?".
- **Hipótese é o que o usuário não decidiu.** Escolheu uma alternativa: é decisão, vai sem marca e entra em Decisões. Não sabe e aceitou a recomendação, ou modo Direto: `(hipótese)` no fim da linha, nessa forma literal, onde a decisão é tomada.
- Sem travessão "—" nas perguntas nem nos documentos gerados.

Depois do último bloco, resuma as decisões e as hipóteses em até oito linhas e siga para gerar.

## Passo 3: gerar

**Complexidade** (vai no cabeçalho da spec e dimensiona o resto):

| Complexidade | Plano | Spec |
|---|---|---|
| trivial | 1 a 2 fases, 2 a 4 passos | Contratos de interface e Modelo de dados podem dizer "não se aplica" com o motivo |
| simples | 2 a 3 fases, 5 a 8 passos | Idem |
| média | 3 a 4 fases, 10 a 15 passos | Todas as seções com conteúdo |
| complexa | 4 a 5 fases, 15 a 25 passos | Todas, com exemplos JSON, constraints e migração descrita |

**spec.md.** Preencha `assets/spec-template.md` sem mudar títulos nem ordem. O cabeçalho registra as versões do PRD e do HLD lidas, e é por elas que o validador avisa quando a spec ficou para trás; não ponha versão, data ou autor da própria spec, que envelhecem e ninguém atualiza. Do RF para a spec:

| Bloco do RF | Vai para |
|---|---|
| Descrição, Fluxo principal, Fluxos alternativos e exceções | Escopo (Incluído) e Regras e fluxos |
| Depende de (itens `dado`) | Escopo (Entradas), pela interface da spec do RF de origem |
| Dependentes diretos | Escopo (Saídas): o que eles vão consumir |
| Erros previstos | Tratamento de erros, uma linha por erro |
| Decisões de produto e requisitos não funcionais que tocam o RF | Regras e fluxos |
| Linha do RF na rastreabilidade do HLD | Componentes e Contratos de interface |

A Estratégia de testes orienta quem implementa (arquivos, funções, níveis) e **não** liga teste a critério de aceitação: essa ligação existe num lugar só, o manifesto do contrato. Duas cópias divergem na primeira mudança. Spec descreve estrutura, não traz código; JSON de exemplo e migração descrita são estrutura. A Estratégia de testes também traz a tabela `Verificação por superfície`, uma linha por seção de superfície do contrato com o mecanismo e a decisão que o sustenta (`references/contrato.md` seção 6).

**plan.md.** Preencha `assets/plan-template.md`. Passos numerados de forma contínua entre as fases, no formato `N. **Componente:** o que fazer`, cada um de 1 a 3 frases dizendo **o quê**; o como está na spec. Sem fase de testes (teste acompanha cada passo), sem estimativa de tempo, sem decisão de arquitetura e sem detalhe de implementação (tipo, coluna, método).

**contract.md.** Siga `references/contrato.md` à risca: é a fonte única da forma do contrato. Em resumo: Pré-requisitos primeiro, nas cinco subseções fixas e dentro do fecho de dependências; Gates de qualidade; manifesto com o texto literal de cada critério que `contexto.py` listou; uma seção por superfície, cada uma com `Modo de verificação:`; itens `<SUPERFÍCIE>-<CAPACIDADE>-<NN>` com Dado, Quando e Então.

## Passo 4: validar e salvar

1. Faça a checagem de conteúdo de `references/entrevista.md` seção 5.
2. Escreva os três arquivos em `docs/features/<pasta>/` (a pasta que `contexto.py` indicou) e rode `python3 <skill-dir>/scripts/validate.py docs/features/<pasta>`. Ele confere a forma dos três e cruza com PRD, HLD, ADRs e roadmap: critério do manifesto que não é literal, **critério sem item** (o portão de cobertura), RF fora do fecho, handle sem declaração, ADR superseded, componente fora do HLD, seção de testes no plano, superfície sem mecanismo de verificação decidido e item que exige PR ou CI.
3. **Portão de cobertura.** Se o validador acusar critério sem item e você não conseguir cobri-lo, apague os três arquivos e reporte a lacuna com o texto literal do critério (formato em `references/contrato.md` seção 2). Os três existem juntos ou nenhum: uma pasta com spec e sem contrato válido parece pronta e não está.
4. Corrija até sair sem erro. Aviso se resolve corrigindo ou explicando no relatório.

## Passo 5: roadmap e issue

**Roadmap.** Spec gerada é o começo do trabalho no RF. Se o status no roadmap é `pendente`, rode:

```
python3 .claude/skills/prd-writer/scripts/roadmap.py set RF-NNN "em andamento" --motivo "spec em docs/features/<pasta>/"
```

Status `em andamento`, `feito` ou `bloqueado` não se mexe: quem marcou sabe mais que a skill. A fundação não entra no roadmap, porque não é RF. Não edite `docs/product/roadmap.md` à mão: o `make check-prd` regenera e compara.

**Issue.** Só com a flag `criar-issue` ou um sim explícito: siga `references/issue.md`.

## Modo: Revisão

1. Leia os três arquivos atuais e rode `contexto.py rf`. Compare as versões de PRD e HLD do cabeçalho da spec com as atuais e diga o que mudou que toca este RF (critério novo ou reescrito, dependência nova, componente renomeado).
2. **O contrato se regenera inteiro**, sempre: ele é derivado, e a linha em itálico avisa que edição à mão se perde. Mantenha os IDs dos itens que continuam valendo, para o diff mostrar só o que mudou.
3. Na spec e no plano, mude só o que a mudança do PRD, do HLD ou o pedido toca, e atualize as versões no cabeçalho.
4. Valide e reporte o que mudou nos três.

## Regras que não se negociam

Cada uma existe porque a alternativa já deu errado em algum lugar:

- **Critério literal e coberto.** O manifesto copia o PRD letra por letra e todo critério tem item. Resumir o critério esconde a mudança quando o PRD for revisado; critério sem item é um "pronto" que ninguém verifica.
- **Fecho de dependências é a fronteira.** O contrato só exige o que este RF e o seu fecho entregam. Exigir o login de um RF do qual este não depende faz o contrato só rodar quando outro time terminar; o padrão de preparação resolve isso dentro do próprio RF.
- **Nada de stack nova sem ADR.** Tecnologia que nenhum ADR aceito cobre vai para "Pendentes de ADR" e para o relatório, e o próximo passo é `/adr-writer`.
- **Contrato agnóstico.** Ele descreve comportamento, nunca quem o executa, nem com que ferramenta. Assim serve a uma pessoa, a uma suíte de testes ou a um agente.
- **Contrato verificável antes do código.** Cada superfície tem mecanismo decidido na spec (ou pendente de ADR, que bloqueia a implementação), cada item roda no ambiente local sem PR nem CI, e o que ele promete sobre ferramenta externa foi conferido. Item que nasce impossível de verificar só aparece como reprovado depois de toda a implementação.
- **Convenções do projeto, não inventadas.** Caminho de fixture, seed, configuração de teste e mocks vêm dos contratos anteriores, da fundação ou do código; divergir exige justificativa na spec.
- **Nada no spec.md liga teste a critério**, nem anota critério de outro RF como "fora de escopo": a fronteira já está codificada no manifesto.
- **Sem comentário HTML** no contrato e **sem travessão** nos três arquivos.

## Finalizar

Reporte em poucas linhas:

- os três caminhos, a complexidade e o número de fases e passos do plano;
- o contrato: itens por superfície e critérios cobertos ("14 itens: API HTTP 8, UI 4, E2E 2; 5 de 5 critérios");
- o que mudou no roadmap e o link da issue, se houve;
- as hipóteses, as que mais mudam o desenho primeiro, cada uma com a alternativa descartada;
- as decisões pendentes de ADR, com o próximo passo `/adr-writer`;
- avisos de prontidão (dependência não feita, fundação por fazer) e pendências (issue que falhou e o comando para rodar à mão).
