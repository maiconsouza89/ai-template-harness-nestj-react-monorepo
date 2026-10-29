---
name: hld-writer
description: Conduz uma entrevista em blocos por etapa e gera o HLD (High-Level Design) em `docs/architecture/hld.md`, em português, com diagrama de componentes (Mermaid), fluxos, modelo de dados, interfaces com protocolo e SLA, escalabilidade, segurança, observabilidade, riscos e rastreabilidade com os RF-NNN do PRD. Antes de escrever, lê o PRD e os ADRs em `docs/architecture/adr/` - ADR aceito é cenário dado, proposto vira pergunta, superseded entra pelo sucessor, tecnologia sem ADR fica `pendente de ADR`. É o "como" técnico entre o PRD (`/prd-writer`) e os ADRs (`/adr-writer`). Use sempre que o usuário quiser escrever, revisar ou atualizar um HLD, "desenho da solução", "arquitetura do sistema", "design técnico", "como o sistema vai ser construído", "quais componentes e como se integram", mesmo sem dizer HLD; quando colar um PRD ou brief técnico e pedir para "desenhar a arquitetura" ou "definir os componentes"; ou quando `docs/architecture/hld.md` já existir e ele quiser mudar componente, interface, fluxo ou meta.
---

# HLD Writer

O HLD responde quatro perguntas para quem vai implementar e para quem vai operar: **como a solução se divide em componentes, como eles conversam, onde o dado vive e o que garante que isso escala, resiste, é seguro e é observável**. Tudo nesta skill serve a isso.

Ele fala do **como** técnico. Não reconta a regra de negócio: isso é o PRD em `docs/product/prd.md`, e o HLD o cita por `RF-NNN`. Também não é o lugar de justificar cada escolha de tecnologia: isso é ADR em `docs/architecture/adr/`, e o HLD aponta para o número. A divisão de trabalho neste repositório é **PRD diz o quê, HLD diz como, ADR diz por quê**. Quem escolhe a arquitetura é o usuário; a skill traz as alternativas, recomenda uma e registra a escolha. Quando o usuário trouxer uma tecnologia na entrevista, ela entra no HLD com a coluna "Decisão" preenchida: o ADR que já existe, ou `pendente de ADR` com a decisão listada no fim do documento e no relatório final. Tecnologia sem decisão registrada é a primeira coisa que o leitor de daqui a seis meses vai questionar.

## Modos

| Situação | Modo |
|---|---|
| Pedido de HLD sem material, ou com uma ideia em poucas frases | **Entrevista** |
| Usuário entregou um brief técnico razoavelmente completo (ou há PRD) e pediu para não ser entrevistado, ou está rodando sem interação | **Direto** |
| `docs/architecture/hld.md` já existe e o pedido é mudar algo | **Revisão** |

Em qualquer modo, comece lendo `assets/template.md` (esqueleto obrigatório da saída) e `references/entrevista.md` (perguntas por etapa, opções para oferecer, defaults e checagens). Leia os dois antes da primeira pergunta: a entrevista é guiada pelo que o template vai precisar, não o contrário.

## Passo 0: destino e insumos

O HLD do sistema vive em **`docs/architecture/hld.md`** na raiz do repositório (`git rev-parse --show-toplevel`). Um só arquivo, um só lugar: é o que ADRs, issues e código vão referenciar. Se o arquivo existe, isto é **Revisão**, não um HLD novo. Se o usuário pediu outro caminho (um HLD por módulo, por exemplo), use e diga que está fora do padrão.

Antes de perguntar qualquer coisa, leia o que já existe:

- **`docs/product/prd.md`**, se existir. É de onde saem os RFs que a arquitetura precisa atender e os requisitos não funcionais que viram metas (disponibilidade, performance, segurança, compliance). Anote a versão para o cabeçalho. O `Responsável` é quem o usuário indicar; sem indicação, use o nome do `git config user.name` marcado `(hipótese)` ou escreva `a definir`. Se não existir, diga em uma linha que `/prd-writer` gera um, e continue: o HLD pode nascer sem PRD, mas a seção de rastreabilidade vai dizer isso em vez de fingir cobertura.
- **Os ADRs em `docs/architecture/adr/*.md`**, se existirem. Leia o front-matter de cada um (`status`, `title`, `description`, `superseded-by`), e não o `index.md`: o índice é gerado, pode não existir e não diz o que cada decisão fixa. Monte um inventário curto antes da primeira pergunta e diga em uma linha o que encontrou ("3 ADRs aceitos: 0002 PostgreSQL, 0005 OIDC, 0007 Kafka; 1 proposto" ou "nenhum ADR ainda"), no mesmo espírito da leitura leve que o `/prd-writer` faz do repositório. O status decide como cada ADR entra no HLD:
  - `accepted`: cenário dado. A tecnologia ou padrão entra com `ADR-NNNN` na coluna Decisão e em "ADRs associados". Não vira pergunta nem pendência; só se cita.
  - `proposed`: entra como `ADR-NNNN (proposed)` na coluna Decisão e em "Decisões pendentes de ADR" como "em discussão no ADR-NNNN". Na Entrevista, vira pergunta: seguir com o que o ADR propõe (recomendado, salvo sinal contrário) ou esperar a decisão.
  - `superseded`: cite o sucessor (`superseded-by`), nunca o antigo. O validador trata citação de ADR superseded como erro.
  - `rejected` e `deprecated`: não entram. Se o usuário quiser a opção rejeitada, isso é ADR novo via `/adr-writer`, não uma linha do HLD.

## Modo: Entrevista

Onze etapas, uma por seção do template. Em cada uma: faça **um bloco de perguntas** (não uma por vez e não trinta de uma vez), todas no formato de "Como perguntar" abaixo, depois **resuma em 3 a 6 linhas** o que entendeu e peça confirmação antes de seguir. O resumo é o que evita descobrir na etapa 10 que a etapa 2 foi mal entendida, e ele só contém o que o usuário disse ou escolheu: se você completou algo, isso é pergunta, não linha do resumo.

| Etapa | O que precisa sair dela |
|---|---|
| 1. Contexto e objetivo técnico | Objetivo técnico em poucas frases, problemas técnicos do estado atual com número, sistemas conectados e direção do dado |
| 2. Arquitetura geral | Topologia, ambiente de implantação, tecnologias (cada uma com ADR ou pendência), padrões adotados e por quê |
| 3. Componentes | Lista de componentes com nome estável, responsabilidades, dependências, papel nos dados (persiste, cacheia, orquestra) |
| 4. Fluxos | 2 a 5 fluxos ponta a ponta, do gatilho ao efeito observável; fluxo de dados entre componentes; persistência e consistência |
| 5. Modelo de dados | 4 a 10 entidades, relações com regra, fonte de verdade por entidade, cache, versionamento e retenção |
| 6. Interfaces públicas | Cada interface com tipo, protocolo, exposição e SLA ou limite |
| 7. Escalabilidade e disponibilidade | Volume atual e esperado, estratégia de crescimento, técnicas, metas com número (disponibilidade, RTO, RPO, capacidade) |
| 8. Segurança | Autenticação, autorização, proteção de dados e PII, gestão de segredos |
| 9. Observabilidade | Logs, métricas, tracing, dashboards e alertas ligados às metas |
| 10. Riscos arquiteturais | Probabilidade, impacto, mitigações (lista) e contingência |
| 11. ADRs e próximos passos | ADRs que já cobrem o HLD, decisões pendentes com critério, próximos passos até implementar |

Depois da etapa 11 vem a **rastreabilidade** (ver abaixo). Não pergunte "qual componente atende RF-003?" do zero: derive dos componentes e fluxos que o usuário escolheu e escreva o resultado na própria pergunta ("RF-003 Agendar horário: Serviço de agenda e API pública, no fluxo Cliente agenda"). Onde a derivação deixa escolha (RF sem componente, componente sem RF), pergunte com alternativas e recomendação. O usuário corrige melhor do que inventa, desde que veja o que está corrigindo.

### Como perguntar

O usuário decide; você recomenda. Valem para toda pergunta da skill, em qualquer modo e etapa:

- **Decisão é do usuário, mesmo quando você tem opinião forte.** Topologia, ambiente, tecnologia sem ADR, padrão arquitetural, como dividir componentes, síncrono ou assíncrono, consistência, metas e SLAs, mecanismos de segurança, retenção: tudo isso tem mais de um caminho razoável e vira pergunta com alternativas. Não escolha e peça "confere?". Uma confirmação de sim ou não esconde a escolha que você fez e transforma o usuário em revisor do seu desenho, quando o desenho é dele.
- **Toda pergunta vem com alternativas e uma recomendação.** Use `AskUserQuestion` com 2 a 4 opções concretas, a recomendada primeiro com "(Recomendado)" no rótulo e, na descrição de cada opção, o que ela implica e o que custa em uma frase. A recomendação diz o porquê ligado ao que o usuário já disse (volume, time, meta do PRD), não só "é o padrão". Pergunta aberta também tem alternativas: as leituras plausíveis do brief, ordens de grandeza, os defaults de `references/entrevista.md`. Até a confirmação do resumo de uma etapa tem alternativas: seguir (recomendado quando nada ficou em aberto) e as correções mais prováveis.
- **Recomendação técnica cita a fonte.** Antes de recomendar tecnologia, padrão, protocolo, mecanismo de segurança ou meta de referência (SLA, RTO, retenção), confira a documentação oficial (pelo Context7 ou pela página do projeto) e ponha na descrição de cada opção o que ela recomenda, com a página. Quando as fontes divergem ou não cobrem o ponto, a opção diz isso. Afirmação anterior que a doc desmente se corrige em voz alta. Prós e contras sem fonte não bastam para a pessoa decidir.
- **A pergunta se explica sozinha.** Quem responde vê a caixa da pergunta, não necessariamente o texto acima dela. Se a pergunta se refere a algo que você propôs, ela mesma (ou a opção) diz o quê: o nome do componente e a responsabilidade, a meta com o número, o fluxo com os passos que mudam. Não "Mantém a proposta de topologia?", mas "Como dividir o sistema? Monólito modular com worker separado para filas / Três serviços: API, agenda, notificação / ...". Nada de "isso", "a proposta acima", "o item 2", "o que sugeri".
- **Hipótese é o que o usuário não decidiu.** Escolheu uma alternativa, é decisão dele e vai sem marca. Respondeu "não sei" e aceitou a recomendação para seguir, ou o modo é Direto sem ninguém para perguntar, a linha leva `(hipótese)`. Nunca preencha em silêncio.

Regras da conversa:

- **Inconsistência para a entrevista.** Meta de disponibilidade que a topologia não entrega (um banco sem réplica e 99.99 por cento), componente que aparece num fluxo e não na lista, interface externa sem autenticação: aponte e peça correção antes de continuar.
- **Não invente detalhes.** Se o usuário não deu, é lacuna ou hipótese, nunca fato.
- **Não reabra decisão aceita.** ADR `accepted` em `docs/architecture/adr/` é cenário dado. Se o usuário quiser mudar, isso é um ADR novo com `supersedes`, via `/adr-writer`, não uma linha do HLD.
- Perguntas simples, uma ideia por pergunta, sem travessão "—" no texto. A regra do travessão vale também para o HLD gerado.

## Modo: Direto

Quando o brief ou o PRD já veio, não encene a entrevista. Mapeie o material sobre as onze etapas, preencha o que está lá, marque `(hipótese)` o que você completou com os defaults e **liste as lacunas no relatório final** em vez de perguntar uma a uma. Se houver uma ou duas perguntas cuja resposta muda o HLD inteiro (cloud ou on-premises por restrição legal, um serviço ou vários, dado sensível ou não), faça só essas, no formato de "Como perguntar", e só se houver alguém para responder. Tudo que você escolheu no lugar do usuário é `(hipótese)`, e no relatório cada hipótese que muda a arquitetura vem com as alternativas descartadas, para ele trocar a escolha sem reabrir a conversa.

## Modo: Revisão

1. Leia o `docs/architecture/hld.md` atual inteiro, o `docs/product/prd.md` e os ADRs em `docs/architecture/adr/` se existirem, antes de perguntar qualquer coisa. Se o PRD subiu de versão desde o cabeçalho do HLD, ou se algum ADR citado mudou de status, isso entra na revisão mesmo que o pedido não fale disso: diga o que encontrou e pergunte o que fazer com cada caso.
2. Altere só o que o pedido toca. Se a mudança pedida obriga outras escolhas (para onde vai a responsabilidade do componente que sai, que meta vale agora), pergunte cada uma com alternativas em vez de resolver sozinho. Componente ou interface removida sai da tabela, do diagrama, dos fluxos e da rastreabilidade de uma vez: meia remoção é pior que nenhuma.
3. Refaça a rastreabilidade: quase toda mudança de componente ou interface muda quem atende qual RF.
4. Se a mudança troca uma tecnologia ou padrão com ADR `accepted`, pare e diga que isso pede ADR novo (`/adr-writer`), e só então atualize o HLD apontando para ele.
5. Suba a versão no cabeçalho (`0.1.0` → `0.2.0` para componente, interface ou tecnologia que entra ou sai; `0.1.1` para ajuste de texto ou meta) e a data.
6. Valide e reporte o que mudou.

## Diagrama e rastreabilidade

Dois artefatos fazem o HLD ser lido em vez de arquivado.

**Diagrama de componentes.** Um bloco Mermaid `graph LR` na seção Arquitetura geral, com os componentes da tabela dentro de um `subgraph` do sistema, os sistemas externos fora dele com forma diferente (`{{ }}`), armazenamentos como `[( )]` e uma aresta por dependência. Os nomes dos nós são os mesmos da tabela de componentes, porque o validador cruza os dois e porque o leitor vai procurar o nome do diagrama na tabela. Mermaid porque renderiza no GitHub e ainda é texto greppável para quem não renderiza. Se um fluxo cruzar fronteira assíncrona e for difícil de seguir em lista, um `sequenceDiagram` dentro do fluxo é bem-vindo, mas é opcional.

**Rastreabilidade com o PRD.** Uma tabela que diz, para cada `RF-NNN`, que componentes, interfaces e fluxo o atendem, e uma lista que diz, para cada requisito não funcional do PRD, que seção e meta do HLD o cobre. É o que transforma "a arquitetura parece boa" em "a arquitetura cobre o que foi pedido". RF sem componente é lacuna da arquitetura; componente sem RF é escopo que ninguém pediu, e vai para o relatório final. Sem PRD, a seção abre com uma linha dizendo que não há PRD, e os requisitos tomados do brief entram na mesma tabela numerados como `RB-NN` (requisito do brief), para serem trocados pelos números do PRD quando ele existir. Escreva isso assim, "pelos números do PRD": o validador trata o texto literal RF-NNN como placeholder esquecido, em qualquer lugar do documento. Um prefixo só, sempre esse, para que o leitor e o validador saibam que aquilo não veio de um PRD.

## Estilo e orçamento

O HLD é lido por quem vai implementar e por quem vai operar às 3 da manhã. Tamanho não é rigor.

| Seção | Orçamento |
|---|---|
| Documento inteiro | 250 a 600 linhas; acima disso, há detalhe de implementação que pertence ao código ou a um documento de componente |
| Componentes | 3 a 12. Menos que isso raramente precisa de HLD; mais que isso é mais de um sistema |
| Fluxos | 2 a 5, com 3 a 8 passos cada |
| Entidades | 4 a 10 principais; o esquema completo é do código |
| Interfaces | só as que algo de fora do componente consome |
| Cada risco | probabilidade, impacto, 1 a 3 mitigações, 1 contingência |
| Célula de tabela | 1 a 3 frases; o que não cabe vai para o fluxo ou para o modelo de dados |

Três hábitos fazem quase todo o trabalho:

**Mensurável ou fora.** "Altamente disponível" e "escala bem" não são meta. "99.9 por cento mensal na API externa, RTO de 1 hora, RPO de 15 minutos" é. Mesma régua para SLA de interface (p95 em milissegundos, vazão), para observabilidade (que métrica, que limiar dispara alerta) e para segurança (qual mecanismo, onde).

**Hipótese é marcada, sempre, e na linha em que ocorre.** Tudo que você completou sem o usuário dizer leva `(hipótese)` no fim da linha, nessa forma literal, porque é ela que o validador conta e que o leitor procura; variantes como "(hipótese sobre o volume)" se perdem. Vale para número que o usuário não escolheu (SLA, limite, retenção) e vale em dobro quando o HLD muda algo que o brief ou o PRD disse: reordenar o pipeline, trocar síncrono por assíncrono, dividir um componente. Na Entrevista, mudança dessas nunca é hipótese: é pergunta, com o que o brief diz como uma alternativa e a sua mudança como outra. No Direto, é hipótese marcada no próprio texto, não só no relatório, porque quem lê o HLD daqui a um mês não vai ler o relatório. Quem lê precisa separar o que o time decidiu do que o documento sugeriu. **Uma marca por decisão, na seção onde ela é tomada.** Um SLA de 99,9 por cento que você escolheu é uma hipótese: marque onde ele é definido (escalabilidade), não de novo na tabela de interfaces e na observabilidade que o repetem. O leitor que quer saber o que é hipótese vai à origem; o validador conta marcas, e 30 marcas precisam significar 30 decisões, não 10 ditas três vezes. Passou de 30, antes de qualquer coisa procure repetição e consolide. Se ainda passar, você está desenhando demais pelo usuário: pergunte. O relatório final lista todas as hipóteses, agrupadas por seção, as que mais mudam a arquitetura primeiro.

**Toda tecnologia aponta para uma decisão.** A tabela de tecnologias tem a coluna "Decisão" e ela nunca fica vazia: ou é `ADR-NNNN` que existe em `docs/architecture/adr/` e está `accepted` (ou `ADR-NNNN (proposed)` enquanto a decisão está em discussão), ou é `pendente de ADR` com a decisão repetida em "Decisões pendentes de ADR" com as opções em jogo e o critério de escolha. Tecnologia que já tem ADR aceito nunca fica `pendente de ADR`: isso reabriria uma decisão tomada, e o validador trata como erro. O HLD não é o lugar de argumentar por que PostgreSQL e não outro banco; é o lugar de dizer que o banco é PostgreSQL e onde está o argumento. As pendências que ficam aqui são a fila de trabalho do `/adr-writer`: quando o ADR sai, é ele quem troca `pendente de ADR` por `ADR-NNNN` nesta tabela.

## Finalizar

1. Rode a checagem de consistência de `references/entrevista.md` (seção "Antes de gerar").
2. Preencha `assets/template.md` sem mudar títulos, ordem ou negritos: o validador e quem lê dependem dessa estrutura. Seção sem conteúdo real não fica com placeholder; fica com uma linha dizendo que não se aplica e por quê.
3. Valide: `python3 <skill-dir>/scripts/validate.py docs/architecture/hld.md`. Ele checa seções, placeholders esquecidos, componentes fora do diagrama (e vice-versa), tecnologias sem decisão, interfaces sem protocolo ou exposição, metas sem número, riscos incompletos e RFs da rastreabilidade que não existem no PRD. Cruza com o acervo de ADRs: ADR citado que não existe ou está superseded, rejected ou deprecated é erro; tecnologia pendente que já tem ADR aceito é erro; ADR proposed citado e ADR aceito que o HLD não cita são avisos. Avisa também quando a versão do PRD no cabeçalho ficou atrás da atual. Corrija até sair sem erro; aviso de ADR aceito não citado se resolve citando ou dizendo no relatório por que ele está fora do escopo deste HLD.
4. Reporte: caminho do arquivo, componentes e interfaces (quantidade), RFs cobertos e RFs sem componente, componentes sem RF, decisões pendentes de ADR (as que mais travam a implementação primeiro), hipóteses (as que mais mudam a arquitetura primeiro) e lacunas abertas.
