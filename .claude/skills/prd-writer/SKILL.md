---
name: prd-writer
description: Conduz uma entrevista em blocos por etapa e gera o PRD em `docs/product/prd.md`, em português, com regras de produto, requisitos funcionais numerados (RF-001...) com público, fluxo, critérios de aceitação e do que cada um depende, requisitos não funcionais como metas observáveis e riscos. Mantém junto o roadmap vivo em `docs/product/roadmap.md`, com o grafo de dependências por status, as ondas do que pode ser feito em paralelo, o caminho crítico e o que está liberado. O PRD não fala de stack; decisões técnicas vão para o HLD (`/hld-writer`) e os ADRs (`/adr-writer`). Use sempre que o usuário quiser escrever, revisar ou atualizar um PRD, "documento de requisitos", "levantar requisitos", "o que depende do quê" ou "o que dá pra fazer em paralelo", mesmo sem dizer PRD; quando colar um brief e pedir para "estruturar isso" antes de implementar; quando o PRD existir e ele quiser mudar requisito, escopo ou critério; ou para registrar andamento ("marca o RF-003 como feito", "o que dá pra pegar agora?").
---

# PRD Writer

O PRD responde quatro perguntas para quem vai construir e para quem vai conferir depois: **por que o sistema existe, o que ele precisa fazer, como saberemos que está pronto e do que cada requisito depende**. O roadmap responde o que é derivado disso ou muda toda semana: **em que ordem construir, o que dá para fazer em paralelo e onde estamos**. Tudo nesta skill serve a isso.

O PRD fala de **produto**: regras, fluxos, metas observáveis, riscos. Não fala de stack. Linguagem, banco, framework, protocolo, hospedagem e arquitetura ficam fora, porque o PRD precisa continuar verdadeiro quando a stack mudar, e porque essas escolhas já têm casa neste repositório: ADRs via `/adr-writer` e o HLD via `/hld-writer`. Isso inclui o trabalho de fundação (estrutura inicial do projeto, banco, autenticação): não é RF, é do HLD. Quando o usuário disser "vamos usar X" no meio da entrevista, anote como **decisão pendente de ADR** no relatório final e não no PRD. A exceção é quando a tecnologia é o próprio produto ou uma restrição imposta de fora (integração obrigatória com o ERP da empresa, por exemplo): aí ela entra como dependência externa ou requisito, descrita pelo que faz, não por como é feita.

## Modos

| Situação | Modo |
|---|---|
| Pedido de PRD sem material, ou com uma ideia em poucas frases | **Entrevista** |
| Usuário entregou um brief razoavelmente completo e pediu para não ser entrevistado, ou está rodando sem interação | **Direto** |
| `docs/product/prd.md` já existe e o pedido é mudar requisito, escopo ou critério | **Revisão** |
| O pedido é registrar andamento de um ou mais RFs, ou saber o que está liberado | **Progresso** |

Nos três primeiros, comece lendo `assets/template.md` (esqueleto obrigatório da saída) e `references/entrevista.md` (perguntas por etapa, opções para oferecer, defaults e checagens). Leia os dois antes da primeira pergunta: a entrevista é guiada pelo que o template vai precisar, não o contrário.

## Passo 0: destino e contexto

O PRD vive em **`docs/product/prd.md`** na raiz do repositório (`git rev-parse --show-toplevel`) e o roadmap ao lado, em `docs/product/roadmap.md`. Um só PRD por repositório: é o que `CLAUDE.md`, HLD, ADRs e issues vão referenciar por `RF-NNN`. Se o arquivo existe, isto é **Revisão**, não um PRD novo. Se existir um PRD no caminho antigo `docs/PRD.md`, proponha movê-lo (com `git mv`) antes de seguir. Se o usuário pediu outro caminho, use e diga que está fora do padrão.

Antes da primeira pergunta, faça uma **leitura leve do repositório**: README, o que houver de HLD e ADRs em `docs/architecture/`, e uma olhada na estrutura do código, se houver código. Diga em uma linha o que encontrou ("sistema novo, sem código" ou "já existe cadastro de clientes e um ADR escolhendo o meio de pagamento"). Isso alimenta a etapa 1 e o contexto de implantação, e evita perguntar o que o repositório já responde. ADR `accepted` que fixa uma integração obrigatória (o gateway de pagamento, o ERP) entra no PRD como dependência externa descrita pelo que faz, sem o nome da tecnologia; os demais ADRs não entram, são do HLD. Não transforme isso em auditoria: o objetivo é não fazer pergunta boba, não documentar o código.

## Modo: Entrevista

Oito etapas. Em cada uma: faça **um bloco de perguntas** (não uma por vez e não trinta de uma vez), todas no formato de "Como perguntar" abaixo, depois **resuma em 3 a 6 linhas** o que entendeu e peça confirmação antes de seguir. O resumo é o que evita descobrir na etapa 7 que a etapa 1 foi mal entendida, e ele só contém o que o usuário disse ou escolheu: se você completou algo, isso é pergunta, não linha do resumo.

| Etapa | O que precisa sair dela |
|---|---|
| 1. Contexto e problema | Produto, público, contexto de implantação (sistema novo, substitui ou se integra a algo existente), objetivo de negócio, dor atual com números aproximados, o que já foi tentado |
| 2. Objetivos e métricas | Cada objetivo com métrica e meta alvo. Objetivo sem número vira desejo, não requisito |
| 3. Escopo | Incluso e fora de escopo. Fora de escopo explícito é o que impede a conversa de "mas eu achei que..." meses depois |
| 4. Requisitos funcionais | Um por um: nome, descrição em uma frase, para quem, fluxo principal passo a passo, variações e exceções, erros previstos quando o RF é crítico, prioridade e **critérios de aceitação** (sucesso e falha). É a etapa longa; vá por requisito e confirme cada bloco |
| 5. Requisitos não funcionais | Metas observáveis: tempo de resposta percebido, disponibilidade, quem pode fazer o quê, auditoria, compliance, acessibilidade, compatibilidade (dispositivos, navegadores, idiomas) |
| 6. Decisões de produto e dependências | Regras já dadas (com justificativa e trade-off) e o que precisa chegar de fora: outro time, política, aprovação, serviço de terceiro |
| 7. Riscos | Probabilidade, impacto, mitigações (lista) e plano de contingência |
| 8. Aceitação transversal e validação | Critérios que valem para o sistema todo (derivados de metas e NFRs) e tipos de validação obrigatórios. Os critérios de cada RF já saíram na etapa 4 |

Os critérios de aceitação de um RF saem **junto com o RF**, na etapa 4, porque é ali que o fluxo e os erros estão frescos: cada erro previsto costuma virar um critério de falha. Deixar para o fim produz uma lista genérica que ninguém consegue ligar a um requisito.

Depois da etapa 8 vêm as **dependências entre requisitos** (ver abaixo). Não pergunte "do que RF-003 depende?" do zero: derive do que foi coletado e pergunte com alternativas, cada uma dizendo a dependência por extenso ("RF-003 depende de RF-001 (dado): lê os serviços que RF-001 cadastra"). O usuário corrige melhor do que inventa, desde que veja o que está corrigindo.

### Como perguntar

O usuário decide; você recomenda. Valem para toda pergunta da skill, em qualquer modo e etapa:

- **Toda pergunta vem com alternativas e uma recomendação.** Use `AskUserQuestion` com 2 a 4 opções concretas, a recomendada primeiro com "(Recomendado)" no rótulo e, na descrição, uma linha de por quê. Pergunta aberta também tem alternativas: as leituras plausíveis do que o usuário já disse, ordens de grandeza, os defaults de `references/entrevista.md`. Ele sempre pode responder outra coisa; as opções existem para ele reagir em vez de redigir do zero, e a recomendação para saber o que você faria e por quê. Até a confirmação do resumo de uma etapa tem alternativas: seguir (recomendado quando nada ficou em aberto) e as correções mais prováveis.
- **A pergunta se explica sozinha.** Quem responde vê a caixa da pergunta, não necessariamente o texto acima dela. Se a pergunta se refere a algo que você propôs, ela mesma (ou a opção) diz o quê. Não "Confere a proposta?", mas "RF-005 Ver agenda do dia depende só de RF-002 (dado): marcações do dia. Mantém assim?". Nada de "isso", "a proposta acima", "o item 2".
- **Decisão é do usuário, mesmo quando você tem opinião forte.** Onde há mais de um caminho razoável (dividir um RF, acrescentar um RF que ele não pediu, uma prioridade, uma regra de produto, uma dependência discutível), pergunte com alternativas em vez de decidir e pedir "confere?". Uma confirmação de sim ou não esconde a escolha que você fez.
- **Hipótese é o que o usuário não decidiu.** Escolheu uma alternativa, é decisão dele e vai sem marca. Respondeu "não sei" e aceitou a recomendação para seguir, ou o modo é Direto sem ninguém para perguntar, a linha leva `(hipótese)`. Nunca preencha em silêncio.

Regras da conversa:

- **Inconsistência para a entrevista.** Fora de escopo que contradiz um requisito, meta sem métrica, requisito "alta" que depende de um "baixa": aponte e peça correção antes de continuar.
- **Não invente detalhes.** Se o usuário não deu, é lacuna ou hipótese, nunca fato.
- Perguntas simples, uma ideia por pergunta, sem travessão "—" no texto. A regra do travessão vale também para o PRD gerado.

## Modo: Direto

Quando o brief já veio, não encene a entrevista. Mapeie o brief sobre as oito etapas, preencha o que está lá, marque `(hipótese)` o que você completou com os defaults e **liste as lacunas no relatório final** em vez de perguntar uma a uma. Se houver uma ou duas perguntas cuja resposta muda o PRD inteiro (quem é o público, se o sistema é novo ou substitui um existente), faça só essas, no formato de "Como perguntar", e só se houver alguém para responder. No relatório, cada hipótese que muda o produto vem com as alternativas que você descartou, para o usuário poder trocar a escolha sem reabrir a conversa.

**Brief vago não vira PRD.** Se o pedido tem poucas frases sem domínio claro ("um sistema para gerenciar coisas", menos de umas 20 palavras sobre o produto), pergunte o domínio e o público antes de qualquer etapa, mesmo que o usuário tenha pedido para não ser entrevistado. Um PRD inteiro de hipóteses parece pronto e não é: é pior do que nenhum. Sem ninguém para responder, pare e explique o que falta.

## Modo: Revisão

1. Leia o `docs/product/prd.md` atual inteiro antes de perguntar qualquer coisa.
2. Altere só o que o pedido toca. Requisito novo recebe o próximo `RF-NNN` livre; número nunca é reutilizado, mesmo que um requisito saia, porque issues, commits e o roadmap já podem citá-lo. Requisito removido fica listado em "Fora de escopo" com uma linha de motivo.
3. Revise o bloco **Depende de** dos RFs tocados e dos RFs que dependem deles: quase toda mudança de requisito muda a ordem de construção, e o `sync` recalcula ondas e caminho crítico no roadmap a partir desses blocos.
4. Suba a versão no cabeçalho (`0.1.0` → `0.2.0` para requisito novo ou removido, `0.1.1` para ajuste de texto) e a data.
5. Valide, sincronize o roadmap (o script marca como `removido` o RF que saiu e põe como `pendente` o que entrou) e reporte o que mudou.

## Modo: Progresso

O pedido é "marca o RF-003 como feito", "RF-004 está travado esperando o fornecedor", "o que dá pra pegar agora?", vindo do usuário ou de outra skill que invocou esta.

1. Leia `docs/product/roadmap.md`. Se não existe e o PRD existe, crie com `sync`.
2. Para cada mudança: `python3 <skill-dir>/scripts/roadmap.py set RF-NNN "<status>"`, com `--motivo "..."` quando o status é `bloqueado`. Status válidos: `pendente`, `em andamento`, `feito`, `bloqueado`. `removido` não se marca à mão; vem de o RF sair do PRD.
3. **Não toque no PRD.** Andamento não muda o produto. Se a mudança pedida é de escopo ("o RF-005 não vai mais ser feito"), isso é Revisão: o RF sai do PRD e o roadmap acompanha.
4. Reporte a seção "Situação" do roadmap: onda atual, o que está liberado, o que está bloqueado e o caminho crítico restante. Repasse qualquer aviso do script (RF feito que depende de RF não feito costuma ser status marcado errado).

O roadmap também aceita edição manual da coluna Status; o próximo `sync` preserva o que a pessoa escreveu e recolore o grafo.

## Dependências entre requisitos

O PRD guarda só **do que cada RF depende**, no bloco **Depende de** do próprio RF. O mapa (grafo Mermaid), as ondas de paralelismo e o caminho crítico ficam **só no roadmap**, gerados por `scripts/roadmap.py` desses blocos. A dependência é do produto ("marcar horário lê os serviços cadastrados") e muda quando o requisito muda, por isso mora no RF. Ordem e paralelismo são derivados e consultados durante a execução, junto do status: repetidos no PRD, envelhecem na primeira mudança e incham o documento que só deveria mudar quando o produto muda.

Regras para derivar o bloco:

- **Formato do item**: `- RF-NNN (motivo): o quê` ou `- DEP-N (motivo): o quê`. O motivo de uma `DEP-N` é um dos mesmos três; "externa" não é motivo, é o que o prefixo DEP já diz. Sem dependência, o RF não tem o bloco.
- **Três motivos, e só esses**: **dado** (o RF lê ou altera algo que o outro cria), **fluxo** (o RF é passo posterior obrigatório da mesma jornada) e **regra** (o RF aplica uma regra que o outro define). "Faz sentido fazer depois" não é dependência; é preferência, e preferência não entra no bloco.
- **Dependência de fora é `DEP-N`.** O número vem do cabeçalho na seção Dependências (`### DEP-1 externa: canal de mensagens`). O RF que ela trava a cita no próprio bloco; é assim que ela aparece no grafo do roadmap.
- **Cada item `dado` vira critério de integração** na seção global de critérios ("RF-001 → RF-002: o serviço criado aparece na marcação com a duração certa"). É onde costuma quebrar quando dois RFs são feitos em paralelo por pessoas diferentes; o validador cobra.
- **Só dependências diretas.** Se RF-003 depende de RF-002 e RF-002 de RF-001, RF-003 não cita RF-001. Dependência transitiva polui e esconde o caminho crítico.
- **Sem ciclos.** Ciclo significa que dois requisitos são um só ou que um deles precisa ser dividido. Resolva antes de escrever.
- **RFs atípicos se questionam.** RF sem dependência nenhuma (nem de nem para) ou com 4 ou mais quase sempre é derivação errada. Pergunte; o validador avisa.
- **Prioridade herda para trás.** Se um RF de prioridade alta depende de um de prioridade baixa, o de baixa não é baixa. Sinalize e corrija na etapa de requisitos.
- **Parte essencial e parte melhoria podem virar dois RFs.** Se um RF tem um núcleo sem o qual a entrega não serve e um acréscimo que pode esperar (exportar em mais formatos, filtros avançados), dividir faz o acréscimo aparecer nas ondas e no roadmap em vez de ficar escondido dentro de um RF "alta". O critério é **prioridade diferente**, não "dá para separar". Na Entrevista, pergunte com as duas alternativas (dividir em RF-NNN núcleo e RF-NNN acréscimo, ou manter um só) e a recomendação; no Direto, divida só com prioridade claramente diferente e marque `(hipótese)`. Na Revisão isso pesa mais, porque o usuário descreveu a mudança; dividir sem motivo de prioridade é reescrever o pedido dele.

Ondas, para o relatório e para conferir o roadmap: onda 1 são os RFs sem dependência de outro RF; um RF entra na onda n quando todas as suas dependências estão em ondas menores. RFs da mesma onda podem ser desenvolvidos em paralelo, e o caminho crítico (a cadeia mais longa) define o prazo mínimo. Quem calcula é o `roadmap.py`; não escreva ondas no PRD.

## Roadmap vivo

`docs/product/roadmap.md` é gerado por `scripts/roadmap.py` a partir do PRD e nunca é escrito à mão do zero. Ele tem a situação atual (concluídos, onda atual, liberados para começar, em andamento, bloqueados, caminho crítico restante), o grafo de dependências com os nós coloridos por status e a tabela de ondas com as colunas Status, Observação e Depende de. O PRD é a fonte de **o que** e **do que depende**; o roadmap é a fonte de **em que ordem**, **o que em paralelo** e **onde estamos**. Por isso eles são arquivos separados: o PRD só muda quando o produto muda, e sua versão continua significando algo.

Todo PRD criado ou revisado termina com `python3 <skill-dir>/scripts/roadmap.py sync` (o padrão é `--prd docs/product/prd.md`). O sync preserva os status existentes, põe RF novo como `pendente` e marca como `removido` o RF que saiu, mantendo a linha como histórico. A saída é determinística: rodar duas vezes sem mudança não altera o arquivo.

## Estilo e orçamento

O PRD é lido por quem vai implementar sob pressão de prazo. Tamanho não é rigor.

| Seção | Orçamento |
|---|---|
| Documento inteiro | 250 a 1000 linhas; acima disso, há requisito que devia ser dividido em outro PRD ou detalhe que é de implementação |
| Requisitos funcionais | 6 a 15. Menos que isso raramente é um sistema; mais que isso é mais de uma entrega |
| Resumo | até 5 frases |
| Cada problema priorizado | 1 linha com impacto e prioridade |
| Para quem, em cada RF | 1 linha: público do Contexto e o que ganha |
| Fluxo principal de um RF | 3 a 8 passos |
| Critérios de aceitação de um RF | 2 a 5, pelo menos um de sucesso e um de falha |
| Cada critério de aceitação | 1 frase verificável |
| Cada risco | probabilidade, impacto, 1 a 3 mitigações, 1 contingência |

Alguns hábitos fazem quase todo o trabalho:

**Verificável ou fora.** "Funciona bem" e "deve ser rápido" não são critério nem requisito. "Toda alteração de preço gera registro com quem alterou, valor anterior e horário" é. Mesma régua para metas (número e prazo) e para requisitos não funcionais (um alvo que dê para medir sem saber a stack).

**Erros previstos onde falhar custa caro.** O bloco é obrigatório quando o RF cria, altera ou apaga dado, mexe com dinheiro ou permissão, ou faz algo irreversível. Em RF só de consulta ou exibição, falhar significa recarregar, e o bloco é ruído: omita. Na dúvida, pergunte "se isso falhar em silêncio, alguém perde dado, dinheiro ou acesso?".

**Hipótese é marcada, sempre, e só quando muda o produto.** Tudo que você completou sem o usuário dizer leva `(hipótese)` no fim da linha. Quem lê precisa separar o que o negócio decidiu do que o documento sugeriu. Mas hipótese é para regra de negócio que alguém precisa confirmar (o que conta como falta, quem aprova, acesso expira ou não), não para detalhe de implementação que o time decide sozinho (tamanho de grade de horário, formato de arquivo, limite de upload). Detalhe desse tipo nem entra no PRD. **Uma marca por decisão, no lugar onde ela é tomada.** Se "quem aprova é o gestor direto" é hipótese, marque na regra de produto que a define, não de novo em cada RF que a aplica: o leitor vai à origem, e o validador conta marcas, então 30 marcas precisam significar 30 decisões, não 10 ditas três vezes. Passou de 30, antes de qualquer coisa procure repetição e consolide. Se ainda passar, você está decidindo demais pelo usuário: corte. O relatório final lista todas as hipóteses juntas, as que mais mudam o produto primeiro.

**Requisito que o usuário não pediu é exceção, e vem avisado.** Às vezes falta um RF sem o qual uma meta não se mede (um painel de indicadores) ou um fluxo não fecha (cadastrar antes de listar). Na Entrevista, pergunte com alternativas (acrescentar o RF, dizendo qual e que meta ou fluxo ele fecha; deixar a meta sem medição; tirar a meta) e a sua recomendação. No Direto, acrescente, marque `(hipótese)` no nome e destaque no relatório final em uma lista própria, "requisitos que eu adicionei", para o usuário aprovar ou cortar. Requisito inventado sem aviso é a forma mais cara de hipótese: vira trabalho.

## Finalizar

1. Rode a checagem de consistência de `references/entrevista.md` (seção "Antes de gerar").
2. Preencha `assets/template.md` sem mudar títulos, ordem ou negritos: o validador, o roadmap e quem lê dependem dessa estrutura. Seção sem conteúdo real não fica com placeholder; fica com uma linha dizendo que não se aplica e por quê.
3. Valide: `python3 <skill-dir>/scripts/validate.py docs/product/prd.md`. Ele checa seções, requisitos incompletos (inclusive critérios de aceitação), placeholders esquecidos, `Depende de` fora do formato ou citando RF ou DEP inexistente, ciclos, prioridade que não herda para trás e critério de integração faltando para dependência `dado`. Corrija até sair sem erro.
4. Sincronize o roadmap: `python3 <skill-dir>/scripts/roadmap.py sync`.
5. Reporte: caminhos do PRD e do roadmap, quantidade de RFs por onda com o caminho crítico (lidos do roadmap gerado), requisitos que você adicionou sem o usuário pedir, hipóteses (as que mais mudam o produto primeiro), lacunas abertas e decisões de stack que apareceram e precisam virar ADR. Feche com o próximo passo: `/hld-writer` desenha a arquitetura sobre este PRD e registra essas decisões de stack como `pendente de ADR` no HLD, que é onde o `/adr-writer` as encontra depois. Sem isso a lista morre no chat.
