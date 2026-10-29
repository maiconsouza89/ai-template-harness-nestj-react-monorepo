# Guia da entrevista

Perguntas por etapa, alternativas para oferecer, defaults e checagens antes de gerar. Use como base; adapte ao vocabulário do usuário. Uma ideia por pergunta. Em cada etapa, feche com resumo de 3 a 6 linhas e confirmação.

As perguntas abaixo são o assunto, não o formato. Toda pergunta sai como em "Como perguntar" no `SKILL.md`: 2 a 4 alternativas concretas, a recomendada primeiro com o porquê, e o contexto dentro da própria pergunta. As alternativas e os defaults de cada etapa são a matéria-prima dessas opções; o default é a recomendação quando nada no que o usuário disse aponta para outra. Default só vira `(hipótese)` quando o usuário não decidiu (respondeu "não sei" e aceitou seguir, ou modo Direto).

## Sumário

1. Etapa 1: contexto e problema
2. Etapa 2: objetivos e métricas
3. Etapa 3: escopo
4. Etapa 4: requisitos funcionais
5. Etapa 5: requisitos não funcionais
6. Etapa 6: decisões de produto e dependências
7. Etapa 7: riscos
8. Etapa 8: aceitação transversal e validação
9. Dependências entre requisitos
10. Antes de gerar

## Etapa 1: contexto e problema

Perguntas
- Qual é o sistema, em duas ou três frases, e qual resultado de negócio ele precisa produzir?
- Quem usa? Liste os públicos e o que diferencia cada um (papel, frequência de uso, nível técnico).
- O sistema é novo, substitui algo que existe hoje (planilha, processo manual, sistema legado) ou se integra a algo existente? Descreva o que esse algo faz hoje.
- O que está ruim hoje: caro, lento, inseguro, frágil, manual? Peça um exemplo recente com número aproximado (horas perdidas por semana, reais por mês, erros por lote, clientes perdidos).
- O que já foi tentado e não resolveu?

Se a leitura do repositório no passo 0 já respondeu alguma dessas (sistema existente, público citado no README), confirme em vez de perguntar.

Alternativas para o público: usuário final externo; operador interno; administrador ou gestor; recomende a combinação que o brief sugere. Para números, ofereça ordens de grandeza (dezenas, centenas, milhares) e recomende a que o contexto indica; se o usuário não souber, registre como hipótese.

## Etapa 2: objetivos e métricas

Para cada objetivo: resultado mensurável, métrica que o representa, meta alvo com prazo. Objetivo → métrica → meta é uma linha da tabela; linha incompleta não entra.

Ofereça 2 ou 3 métricas plausíveis para o tipo de objetivo, recomendando a que o usuário já consegue medir hoje:
- reduzir esforço: horas por semana, passos por tarefa, tempo até concluir
- reduzir erro: taxa de erro por lote, retrabalho por mês, tickets de suporte
- crescer: cadastros por mês, conversão, retenção em 30 dias
- confiabilidade: incidentes por mês, tempo de recuperação

## Etapa 3: escopo

- O que precisa obrigatoriamente estar pronto nesta entrega?
- O que fica explicitamente fora, mesmo que alguém vá pedir?

Ofereça como alternativas os itens que o brief deixou ambíguos ("exportação para o contábil: entra nesta entrega, fica fora, entra só como arquivo manual"), cada um com a recomendação ligada aos objetivos.

Teste cada item de fora de escopo contra os objetivos e os requisitos já ditos: fora de escopo que impede um objetivo é contradição e precisa ser resolvida agora.

## Etapa 4: requisitos funcionais

Para cada requisito, nesta ordem:
1. Nome curto (verbo + objeto: "Cadastrar produto", "Aprovar reembolso").
2. Descrição em uma frase: o que o sistema faz.
3. Para quem: qual público da etapa 1 usa este RF e o que ganha com ele. Se nenhum público ganha nada, o RF provavelmente é detalhe de implementação ou fundação técnica, e fundação é do HLD.
4. Fluxo principal, passo a passo (3 a 8 passos), do gatilho ao resultado.
5. Variações comuns e exceções.
6. Condições de bloqueio ou erro, e o que o usuário vê em cada uma. Só para RF crítico: cria, altera ou apaga dado, mexe com dinheiro ou permissão, ou é irreversível. RF de consulta pula este item.
7. Prioridade: alta (sem isso a entrega não serve), media (entrega serve, mas pior), baixa (pode ficar para depois).
8. Critérios de aceitação: 2 a 5 frases verificáveis, pelo menos uma de sucesso e uma de falha. Cada erro previsto costuma virar um critério de falha. Não pergunte "quais são os critérios?" do zero: escreva os critérios derivados do fluxo dentro da pergunta e ofereça alternativas onde há escolha real (o limite é 2 horas ou 24 horas; a falha bloqueia ou só avisa), com a recomendação.
9. Dependências: do que este RF depende e por quê (dado, fluxo ou regra). Derive do fluxo e ofereça como alternativa, com o item escrito por extenso.

Peça a lista de requisitos antes de detalhar; depois detalhe um por um e confirme cada bloco. Se o usuário descreve um requisito que depende de outro ainda não listado, registre o novo e volte.

Sinais para dividir um requisito: fluxo principal com mais de 8 passos; dois gatilhos diferentes; dois públicos com fluxos diferentes; uma parte essencial e outra que pode esperar. Diante de um sinal, pergunte com as alternativas (dividir, dizendo em quais RFs e com que prioridade; manter um só) e recomende uma. Fora desses sinais, mantenha o requisito como o usuário o descreveu.

## Etapa 5: requisitos não funcionais

Colete como meta observável sem citar tecnologia. Ofereça como alternativas o default abaixo (recomendado, salvo sinal contrário no que o usuário disse) e uma ou duas variações mais e menos exigentes, com o custo de cada uma em uma frase.

| Categoria | Pergunta | Default (recomendação) |
|---|---|---|
| Performance | Quanto tempo o usuário tolera esperar nas ações principais? | ações comuns respondem em até 1 segundo para 95 por cento dos casos; relatórios e exportações em até 10 segundos |
| Disponibilidade | Quando o sistema pode ficar fora? Custa quanto por hora parado? | 99.9 por cento mensal para público externo; 99.5 por cento para uso interno |
| Segurança e autorização | Quem pode ver e alterar o quê? O que é sensível? | autenticação obrigatória; permissão por papel; alterações sensíveis registradas com autor, valor anterior e horário |
| Auditoria e rastreabilidade | O que precisa ser reconstruído depois do fato? | toda operação que altera dinheiro, estoque ou dado pessoal é rastreável |
| Confiabilidade e integridade | Que dado nunca pode ficar inconsistente? | operações críticas acontecem por inteiro ou não acontecem |
| Compatibilidade | Em que dispositivos, navegadores e idiomas? | navegadores dos últimos 2 anos, desktop e celular; português do Brasil |
| Compliance | Há norma aplicável (LGPD, setor regulado, contrato)? | dados pessoais tratados conforme a LGPD |
| Acessibilidade | Há exigência legal ou de público? | fluxos principais operáveis por teclado e leitor de tela |

Performance e disponibilidade entram sempre, nem que como hipótese: sem elas ninguém sabe o que é "lento" nem o que é "caiu".

## Etapa 6: decisões de produto e dependências

Decisões: que regras de produto já estão dadas (modelo de cobrança, quem aprova, o que é obrigatório no cadastro, política de cancelamento)? Para cada uma: por que, e o que se perde com ela. Decisão sem trade-off provavelmente ainda não foi pensada.

Para regra que o usuário ainda não definiu (política de cancelamento, quem aprova), ofereça as alternativas usuais do domínio com a recomendação e o trade-off de cada uma; a escolha dele vira a decisão e o trade-off.

Se o usuário traz decisão técnica ("vai ser em tal linguagem", "vamos usar tal banco"), agradeça, anote em "decisões pendentes de ADR" para o relatório final e não a ponha no PRD.

Dependências, três tipos:
- externa: serviço ou dado de terceiro (gateway de pagamento, API de CEP, emissão de nota)
- organizacional: outro time ou área precisa entregar ou aprovar (design, jurídico, política comercial)
- pré-requisito: algo que precisa existir antes, descrito pelo que faz (base de clientes migrada, cadastro de produtos saneado)

Para cada uma: quem entrega o quê, por quê, e o que trava enquanto não chega. Cada dependência recebe um id `DEP-N` no cabeçalho (`### DEP-1 externa: título`), e o RF que ela trava a cita no próprio **Depende de**.

## Etapa 7: riscos

Para cada risco: frase única, probabilidade (baixa, media, alta), impacto concreto, mitigações (uma ou mais), plano de contingência se acontecer mesmo assim.

Ofereça como alternativas (seleção múltipla) os riscos típicos do que foi coletado, recomendando os que o contexto torna mais prováveis: dependência externa atrasar; adoção baixa pelo público; dado legado pior que o esperado; regra de negócio mudar no meio; volume maior que o previsto.

## Etapa 8: aceitação transversal e validação

Os critérios de cada RF já saíram na etapa 4. Aqui ficam dois grupos na seção global:
- Integração entre requisitos: um critério por item `dado` de **Depende de**, citando os dois RFs ("RF-001 → RF-002: serviço cadastrado aparece na marcação com a duração certa"). Você deriva esses dos blocos **Depende de**; não pergunte.
- Transversais: o que vale para o sistema todo, derivado das metas e dos NFRs. Uma frase cada, verificável por alguém de fora do time. Exemplo bom: "Toda alteração de preço gera registro com quem alterou, preço anterior e horário". Exemplo ruim: "sistema funciona bem".

Validação (ofereça as alternativas abaixo como seleção múltipla, recomendando as que cobrem os RFs de prioridade alta): que tipos são obrigatórios (testes automatizados das regras críticas, ponta a ponta do fluxo principal, carga na meta de performance, acessibilidade, segurança de permissões) e qual estratégia (roteiro de aceitação com usuário real, validação exploratória interna, piloto com grupo restrito).

## Dependências entre requisitos

Depois da etapa 8, revise as dependências de todos os RFs juntas, sem perguntar do zero. Derive do que foi coletado cada item `RF-NNN (dado|fluxo|regra): o quê`; nas de dado, diga qual dado ("RF-002 depende de RF-001 (dado): os serviços com duração e preço"), porque isso vira um critério de integração. Só pergunte onde há escolha de verdade: uma dependência discutível (é dado ou só preferência de ordem?), um RF sem dependência nenhuma, um RF com 4 ou mais. Para cada uma, a pergunta traz a dependência escrita e as alternativas (manter, trocar o motivo, tirar), com a recomendação. Mostre também as ondas e o caminho crítico que sairão no roadmap, para o usuário ver o efeito, mas não as escreva no PRD.

## Antes de gerar

Confirme cada item; o que falhar volta para a etapa correspondente.

- Cada objetivo tem métrica e meta com número.
- Cada RF tem nome, descrição, para quem, fluxo principal com 3 a 8 passos, prioridade e 2 a 5 critérios de aceitação (sucesso e falha).
- Todo RF que cria, altera ou apaga dado, mexe com dinheiro ou permissão, ou é irreversível tem erros previstos.
- Todo item `dado` de **Depende de** tem um critério de integração citando os dois RFs.
- Requisitos não funcionais incluem performance e disponibilidade, mesmo como hipótese.
- Nenhum item fora de escopo contradiz um requisito ou objetivo.
- Toda decisão de produto tem justificativa e trade-off.
- Cada dependência diz quem entrega o quê.
- Cada risco tem probabilidade, impacto, mitigação e contingência.
- Cada critério de aceitação, do RF ou transversal, é verificável por alguém de fora.
- Nenhum RF de prioridade alta depende de um RF de prioridade baixa.
- As dependências não têm ciclo nem item transitivo; todo item tem motivo dado, fluxo ou regra; todo `DEP-N` citado existe em Dependências.
- O PRD não tem grafo, ondas nem caminho crítico: isso é do roadmap.
- Nada no PRD cita linguagem, framework, banco, protocolo ou hospedagem, salvo integração obrigatória descrita pelo que faz.
- Toda hipótese está marcada com `(hipótese)`, e nada que o usuário escolheu está marcado como hipótese.
- Nenhuma decisão com mais de um caminho razoável foi tomada por você sem pergunta (na Entrevista).
- Nenhum travessão "—" no texto.
