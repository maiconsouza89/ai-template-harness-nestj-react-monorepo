# Guia da entrevista

Perguntas por etapa, alternativas para oferecer, defaults e checagens antes de gerar. Use como base; adapte ao vocabulário do usuário. Uma ideia por pergunta. Em cada etapa, feche com resumo de 3 a 6 linhas e confirmação.

Conteúdo
- Antes da etapa 1: o que ler do PRD e dos ADRs
- Etapas 1 a 11, uma por seção do template
- Rastreabilidade, derivada depois da etapa 11
- Antes de gerar: checagem de consistência

As perguntas abaixo são o assunto, não o formato. Toda pergunta sai como em "Como perguntar" no `SKILL.md`: 2 a 4 alternativas concretas com o que cada uma implica, a recomendada primeiro com o porquê, e o contexto dentro da própria pergunta. As alternativas e os defaults de cada etapa são a matéria-prima dessas opções; o default é a recomendação quando nada no que o usuário disse aponta para outra, nunca a resposta já escolhida. Default só vira `(hipótese)` quando o usuário não decidiu (respondeu "não sei" e aceitou seguir, ou modo Direto).

Antes da etapa 1, leia `docs/product/prd.md` e o front-matter dos ADRs em `docs/architecture/adr/*.md` se existirem (não o `index.md`, que é gerado e pode faltar). Metade das perguntas abaixo já tem resposta lá: use isso como alternativa recomendada em vez de perguntar do zero, citando a origem na própria pergunta ("Que disponibilidade a API externa precisa entregar? 99.9 por cento mensal, como pede o PRD (Recomendado) / 99.5 por cento, mais barato, exige rever o PRD / ..."). ADR `accepted` não vira pergunta: é cenário dado, e só se cita. ADR `proposed` vira pergunta com o que ele propõe como alternativa recomendada ("O ADR-0009 propõe Redis para cache; segue com ele (Recomendado) / espera a decisão e deixa cache como pendente / ..."). ADR `superseded` só entra pelo sucessor; `rejected` e `deprecated` não entram.

## Sumário

1. Etapa 1: contexto e objetivo técnico
2. Etapa 2: arquitetura geral
3. Etapa 3: componentes e responsabilidades
4. Etapa 4: fluxos de requisição e de dados
5. Etapa 5: modelo de dados
6. Etapa 6: interfaces públicas
7. Etapa 7: escalabilidade e disponibilidade
8. Etapa 8: segurança
9. Etapa 9: observabilidade
10. Etapa 10: riscos arquiteturais
11. Etapa 11: ADRs e próximos passos
12. Rastreabilidade
13. Antes de gerar

## Etapa 1: contexto e objetivo técnico

Perguntas
- Em duas ou três frases, o que este sistema ou módulo precisa fazer tecnicamente? (Se há PRD, ofereça duas ou três formulações a partir do resumo e dos RFs de prioridade alta, escritas por extenso nas opções.)
- O que está ruim hoje em termos técnicos: acoplamento, latência, operação manual, falta de rastreio, custo, risco de segurança? Peça um exemplo com número.
- Com que sistemas, módulos ou features este se conecta, e em que direção o dado flui?
- É sistema novo, substitui algo ou se encaixa em algo que já existe? O que já existe e não pode mudar?

Alternativas para os sistemas conectados (seleção múltipla): identidade e acesso; notificação (e-mail, mensagem); pagamento; sistema legado que detém o dado de origem; analytics.

## Etapa 2: arquitetura geral

Perguntas
- Como o sistema se divide em alto nível: um serviço só, poucos serviços, muitos microsserviços, pipeline de dados, agentes?
- Onde roda: cloud (qual), on-premises, híbrido? Há restrição de dados que obriga um lugar?
- Quais tecnologias já estão decididas (linguagem, banco, mensageria, framework)? Para cada uma: há ADR em `docs/architecture/adr/`? Com ADR `accepted`, entra com o número e não se pergunta. Com ADR `proposed`, entra como `ADR-NNNN (proposed)`. Sem ADR, vira "pendente de ADR". Tecnologia que o usuário cita e que contradiz um ADR aceito não entra no HLD: diga que isso pede ADR novo com `supersedes`, via `/adr-writer`.
- Que padrões arquiteturais fazem sentido aqui e por quê: camadas, hexagonal, event-driven, CQRS, REST, gRPC, BFF, saga?

Alternativas de topologia, recomendando pela escala e pelo time que o usuário descreveu:
- time pequeno e domínio ainda em movimento: monólito modular com fronteiras claras, pronto para extrair serviços depois
- integrações assíncronas e picos de carga: serviços poucos e grossos com fila ou streaming entre eles
- processamento de dados em volume: pipeline por etapas com armazenamento intermediário

Tecnologia ainda não decidida: ofereça 2 ou 3 alternativas para aquele papel (banco, fila, linguagem) com o trade-off de cada uma e a recomendação; a escolha vai para "pendente de ADR" com essas mesmas opções. Tecnologia que o usuário nomeia sem justificativa: pergunte "por que essa e não a alternativa óbvia?", com as justificativas plausíveis como opções. A resposta é o conteúdo do ADR.

## Etapa 3: componentes e responsabilidades

Para cada componente:
1. Nome curto e estável (vai aparecer no diagrama, na tabela e nos fluxos).
2. Responsabilidades, em uma a três frases. Componente com mais de cinco responsabilidades provavelmente é dois.
3. Dependências internas (outros componentes) e externas (sistemas de fora).
4. Papel nos dados: persiste, cacheia, orquestra, só transforma?

Antes de detalhar, pergunte pela divisão: ofereça 2 ou 3 decomposições coerentes com a topologia escolhida, cada opção com os nomes dos componentes e a responsabilidade de cada um em poucas palavras, e recomende uma. Depois detalhe um por um. Se um componente depende de outro ainda não listado, registre o novo e volte.

Sinais para dividir: responsabilidades de domínios diferentes no mesmo componente; dois ciclos de deploy distintos; dois donos. Diante de um sinal, pergunte com as alternativas (dividir, dizendo em quais componentes; manter um só) e recomende uma.

## Etapa 4: fluxos de requisição e de dados

- Quais fluxos entram: ofereça como seleção múltipla o principal de cada RF de prioridade alta e qualquer um que cruze fronteira assíncrona (fila, evento, stream), recomendando dois a cinco.
- Onde o fluxo tem escolha de desenho (síncrono ou assíncrono, onde validar, quem orquestra), pergunte com alternativas, escrevendo os passos que mudam em cada opção.
- Para cada fluxo, do gatilho ao efeito observável: quem chama quem, onde valida, onde transforma, onde persiste, onde enfileira, o que responde. 3 a 8 passos.
- Para cada dado que cruza fronteira de componente: origem, transformação, destino.
- Onde cada dado grava, como replica e que consistência se promete (forte, eventual, e com que janela).

Default para recomendar na consistência: forte dentro do componente que é fonte de verdade; eventual entre componentes, com janela declarada. Ofereça também a alternativa forte entre componentes, com o custo dela.

## Etapa 5: modelo de dados

- Quais são as entidades principais? Peça as 4 a 10 que sustentam os RFs, não o esquema completo.
- Como se relacionam (1:1, 1:N, N:N) e que regra a relação carrega?
- Para cada entidade, qual componente ou sistema é a fonte de verdade?
- O que é cacheado ou replicado, onde, por quanto tempo e como invalida?
- Esquemas e contratos são versionados como? Dado fica por quanto tempo e o que acontece depois (apaga, anonimiza, arquiva)?

Defaults para recomendar: cache só de leitura com TTL curto e invalidação por evento; retenção alinhada à exigência legal mais longa que se aplica; contratos de interface versionados por versão maior na URL ou no esquema.

## Etapa 6: interfaces públicas

Para cada interface que algo de fora do componente consome:
- Nome, tipo (API, fila, stream, evento, webhook, SDK, arquivo), protocolo e formato (REST/JSON, gRPC/Protobuf, GraphQL, AMQP, Kafka/Avro, SFTP/CSV).
- Exposição: interna (só dentro do sistema ou da organização) ou externa (cliente, parceiro, internet).
- SLA e limites: latência alvo (p95), vazão, rate limit, garantia de entrega.

Alternativas de SLA por tipo (recomende a do tipo da interface e ofereça uma mais e uma menos exigente):
- API síncrona voltada a pessoa: p95 300 ms
- API síncrona entre serviços: p95 100 ms
- fila ou evento: processado em até 1 minuto, entrega ao menos uma vez
- processamento em lote: concluído dentro da janela declarada (ex: até 6h da manhã)

## Etapa 7: escalabilidade e disponibilidade

- Qual é o volume hoje e o esperado em 12 meses (requisições, mensagens, registros, usuários simultâneos)?
- Como o sistema cresce: réplicas horizontais, particionamento, sharding, leitura separada de escrita?
- Onde entra cache, rate limiting, backpressure, circuit breaker?
- Metas: disponibilidade mensal por interface, RTO e RPO, capacidade sem mudar arquitetura.

Defaults para recomendar: 99.9 por cento para interfaces externas e 99.5 por cento para internas; RTO 1 hora e RPO 15 minutos; suportar 10 vezes o volume atual só com réplicas. Se o PRD declarou disponibilidade, ela é a alternativa recomendada, citada como vinda do PRD.

## Etapa 8: segurança

- Como usuários e sistemas se autenticam (SSO, OIDC, chaves de API, mTLS)?
- Como se autoriza: papéis, escopos, políticas, quem administra?
- O que é dado pessoal ou sensível, onde ele passa e onde fica? Precisa anonimizar ou pseudonimizar?
- Criptografia em trânsito e em repouso: onde e com que gestão de chaves?
- Segredos: onde ficam, como rotacionam, quem acessa?

Defaults para recomendar: autenticação obrigatória em toda interface; autorização por papel; TLS em todo tráfego; dados em repouso criptografados pelo provedor; segredos em cofre gerenciado com rotação; dados pessoais tratados conforme a LGPD, com exclusão sob pedido.

## Etapa 9: observabilidade

- Logs: formato estruturado, campos obrigatórios (id de correlação, componente, usuário ou tenant), o que nunca pode ir para o log, retenção.
- Métricas: por interface, erro e latência; por componente, saturação (fila, CPU, conexões); de negócio, as que medem as metas do PRD.
- Tracing: propagação de contexto entre componentes e amostragem.
- Dashboards e alertas mínimos, ligados às metas da etapa 7.

Defaults para recomendar: logs estruturados em JSON com id de correlação ponta a ponta; taxa de erro e latência p95 por interface; tracing distribuído com amostragem de 10 por cento e 100 por cento em erro; alerta quando a taxa de erro ou a latência ultrapassa a meta por 5 minutos.

## Etapa 10: riscos arquiteturais

Para cada risco: frase única, probabilidade (baixa, media, alta), impacto concreto, mitigações (uma ou mais), plano de contingência se acontecer mesmo assim.

Ofereça como seleção múltipla os riscos típicos do que foi coletado, recomendando os que o contexto torna mais prováveis: dependência externa indisponível ou lenta; volume acima do previsto; tecnologia nova para o time; consistência eventual gerando dado divergente visível; migração de dado legado; custo de cloud fora do esperado; único ponto de falha em componente sem réplica.

## Etapa 11: ADRs e próximos passos

- Quais ADRs já cobrem decisões deste HLD? Liste por número e título a partir do inventário lido em `docs/architecture/adr/`, só os `accepted` (e os `proposed`, marcados). ADR aceito que não entrou em nenhuma linha do HLD vira pergunta: ele se aplica a este sistema (cite onde) ou está fora do escopo (diga no relatório)? O validador avisa quando um aceito fica sem citação.
- Que decisões ficaram pendentes (toda tecnologia marcada "pendente de ADR" na etapa 2 entra aqui, e ADR `proposed` entra como "em discussão")? Para cada uma: opções em jogo e critério de escolha. As opções são as que o usuário viu na pergunta; o critério, ofereça como alternativas. Essa lista é o que o `/adr-writer` lê depois para escrever os ADRs.
- Quais são os próximos passos técnicos até a implementação: prova de conceito, ADRs a escrever, detalhamento de componente, contrato de interface a publicar?

## Rastreabilidade

Depois da etapa 11, derive dos componentes, interfaces e fluxos que o usuário escolheu: para cada RF do PRD, o que o atende; para cada requisito não funcional do PRD, que seção e meta do HLD o cobre. Isso é consequência das escolhas dele, não decisão nova, então mostre a tabela escrita na própria pergunta e ofereça seguir (recomendado se não há lacuna) ou corrigir linhas específicas. RF sem componente e componente sem RF são escolhas: pergunte cada um com alternativas (atribuir ao componente X, criar componente, deixar como lacuna declarada; manter o componente como escopo extra, tirar) e recomendação.

## Antes de gerar

Confirme cada item; o que falhar volta para a etapa correspondente.

- Objetivo técnico fala de como, não de por quê; cita RFs em vez de recontar regra de negócio.
- A arquitetura geral sustenta os requisitos não funcionais do PRD (ou os declarados na etapa 7).
- Toda tecnologia da tabela tem ADR associado ou está em "Decisões pendentes de ADR". Nenhum ADR citado está superseded, rejected ou deprecated; nenhuma tecnologia pendente tem ADR aceito no acervo.
- A versão do PRD no cabeçalho é a versão atual do `docs/product/prd.md`.
- Todo componente da tabela aparece no diagrama, e vice-versa.
- Todo componente tem responsabilidades e dependências explícitas.
- Cada fluxo vai do gatilho ao efeito observável em 3 a 8 passos e só cita componentes da tabela.
- Toda entidade principal tem fonte de verdade.
- Toda interface tem tipo, protocolo, exposição e SLA ou limite.
- Metas de disponibilidade e recuperação têm número.
- Segurança e observabilidade têm prática mensurável em cada subseção.
- Cada risco tem probabilidade, impacto, mitigação e contingência.
- Cada RF do PRD aparece na rastreabilidade; nenhum RF citado está fora do PRD.
- Toda hipótese está marcada com `(hipótese)`, e nada que o usuário escolheu está marcado como hipótese.
- Nenhuma decisão de arquitetura foi tomada por você e apenas apresentada para conferir (na Entrevista).
- Nenhum travessão "—" no texto.
