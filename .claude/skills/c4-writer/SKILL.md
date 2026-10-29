---
name: c4-writer
description: Gera e mantém diagramas C4 em PlantUML (C1 System Context, C2 Container, C3 Component, C4 Code Level) em `docs/architecture/diagrams/`, um `.puml` por nível e um `.md` que rastreia cada elemento até a fonte. Por padrão lê `docs/architecture/hld.md` e os ADRs aceitos (tecnologia e versão vêm deles); aceita também um FDD, spec técnica ou brief passado por caminho. Só desenha o nível que a fonte sustenta, marca o que completou como hipótese (borda tracejada) e pula com motivo o que não tem informação, em vez de inventar. Renderiza SVG só a pedido. Use sempre que o usuário pedir diagrama C4, diagrama de arquitetura, "desenha o sistema", "diagrama de containers", "diagrama de contexto", "visualizar a arquitetura", PlantUML do HLD ou do FDD, mesmo sem dizer C4; quando um HLD ou FDD acabou de ser escrito ou mudou e ele quer a figura; ou quando os diagramas em `docs/architecture/diagrams/` ficaram para trás da fonte.
---

# C4 Writer

Os diagramas C4 respondem, em quatro zooms, **quem usa o sistema e com quem ele fala (C1), em que peças implantáveis ele se divide e com que tecnologia (C2), como uma dessas peças se organiza por dentro (C3) e como o código de um componente se estrutura (C4)**. Cada nível tem um público diferente, e a utilidade do conjunto está em o leitor poder descer de um para o outro sem encontrar contradição.

Esta skill **desenha, não decide**. A arquitetura já foi decidida no HLD (`/hld-writer`) e nos ADRs (`/adr-writer`), ou num FDD que o usuário trouxe. Um diagrama que mostra uma fila que ninguém decidiu ter é pior que nenhum diagrama, porque parece documentação e é ficção. Por isso o trabalho tem duas metades de igual peso: desenhar bem o que a fonte diz, e deixar visível, no desenho e no `.md`, o que foi completado e o que ficou de fora.

## Passo 0: fonte, destino e inventário

**Fonte.** Se o usuário passou um caminho (FDD, spec, brief, outro HLD), é ele. Senão, `docs/architecture/hld.md` na raiz do repositório (`git rev-parse --show-toplevel`). Sem nenhum dos dois, pare e diga que `/hld-writer` gera o HLD; desenhar da conversa produz exatamente o diagrama de ficção que a skill existe para evitar. Se o usuário insistir em desenhar a partir de um texto colado, siga, com a fonte declarada como `conversa` e tudo que não foi dito marcado como hipótese.

Além da fonte, leia o que dá contexto a ela:
- **ADRs** em `docs/architecture/adr/*.md`, pelo front-matter (`status`, `title`), não pelo `index.md`. ADR `accepted` diz a tecnologia do container; `proposed` entra com a tecnologia proposta, a tag de hipótese e uma linha em Conflitos e lacunas; `superseded`, `rejected` e `deprecated` não entram (o sucessor, se houver, sim).
- **PRD** em `docs/product/prd.md`, só para os atores do C1 (públicos e papéis) quando a fonte não os nomeia.

**Destino.** `docs/architecture/diagrams/`, com um prefixo `<nome>` em minúsculas e hífen: o nome do sistema do título do HLD (`# HLD: agenda` → `agenda`) ou o nome do arquivo do FDD (`docs/fdd/rate-limiter.md` → `rate-limiter`). Arquivos:

| Arquivo | Conteúdo |
|---|---|
| `<nome>-c1.puml` | System Context |
| `<nome>-c2.puml` | Container |
| `<nome>-c3-<container>.puml` | Component, um por container decomposto (`agenda-c3-api.puml`); `<nome>-c3.puml` se só houver um |
| `<nome>-c4-<componente>.puml` | Code Level, um por componente detalhado; `<nome>-c4.puml` se só houver um |
| `<nome>.md` | Origem de cada elemento, hipóteses, o que ficou de fora e por quê; sem código PlantUML |

Se `<nome>.md` já existe, isto é **Atualização** (ver abaixo), não geração do zero. Se o usuário pediu outra pasta, use e diga que o `make check-c4` só audita `docs/architecture/diagrams/`.

**Inventário.** Antes de desenhar, diga em duas ou três linhas o que encontrou e o que dá para gerar: "HLD 0.2.0, 12 componentes, 11 ADRs aceitos. Dá C1, C2 e C3 da API; C4 fica de fora porque o HLD não tem assinatura nem estrutura de código." Isso deixa o usuário corrigir o plano antes de você escrever cinco arquivos.

## O que cada nível precisa

Gere o nível só se a fonte tiver o que está na coluna do meio. Faltou, o nível é **pulado** com o motivo escrito no `.md`, dizendo o que faltaria na fonte para ele existir. Um conjunto honesto de dois diagramas vale mais que quatro com o terceiro e o quarto inventados.

| Nível | A fonte precisa dizer | De onde sai no HLD |
|---|---|---|
| C1 | O sistema e seu propósito, quem usa, com que sistemas externos troca o quê | Objetivo técnico ("Sistemas e módulos conectados"), externos do diagrama Mermaid, papéis do PRD |
| C2 | Unidades de implantação (processos, apps, bancos, filas, storage), tecnologia de cada uma, como se comunicam | Arquitetura geral (ambiente de implantação, tabela de tecnologias), Componentes, Interfaces públicas (protocolo) |
| C3 | Divisão interna de um container em componentes, com responsabilidade e dependências | Componentes e responsabilidades, quando a tabela mistura módulos internos com processos |
| C4 | Assinaturas, classes ou structs com campos e tipos, padrões de implementação | Quase nunca está num HLD; vem de FDD ou do código |

**Container é o que roda ou guarda dado separadamente.** Módulo que roda dentro do processo de outro (biblioteca, SDK, módulo de um monólito modular) não vira container no C2 nem sistema no C1: aparece na descrição do container que o hospeda e ganha forma própria só no C3. No HLD, a pista está no texto ("dois processos da mesma base de código", "embarcado", "in-process") e na coluna de dependências. Na dúvida sobre o que é processo e o que é módulo, e se a resposta muda o C2, pergunte.

**Qual container ganha C3.** O que a fonte decompõe em três ou mais componentes. Se mais de um se qualifica e a fonte dá peso parecido aos dois, gere os dois; se um deles só aparece em uma linha, ele fica no C2 e entra em Fora do escopo.

## Como desenhar

Leia `references/plantuml-c4.md` antes do primeiro `.puml`. Ele tem o esqueleto de cada nível, a ordem exata dos parâmetros (o erro mais comum, porque não quebra a renderização e põe o texto no campo errado), a tag de hipótese e o formato do C4 Code Level.

- **Idioma da fonte, com acento.** O diagrama fala a língua do documento de origem, com acento, cedilha e til corretos ("Serviço de autenticação", não "Servico de autenticacao"). Nomes de tecnologia e termos do C4 ficam em inglês (Container, Component, API, Worker, Redis, REST), porque é assim que o leitor os procura. O título segue `C<N> • <Nível em inglês> - <Nome>`.
- **Rótulo é o nome da fonte.** O elemento chama "Telas e programação" se o HLD chama assim, não "Serviço de Telas". É por esse nome que o leitor vai procurar no HLD, e é por ele que o validador cruza.
- **Descrição de uma linha** com a responsabilidade, sem repetir o rótulo. Relação com verbo curto no sentido de quem inicia ("Envia cobranças"), e protocolo no `$techn` a partir do C2.
- **Tecnologia do ADR quando há conflito.** Se o HLD diz "fila AMQP" e o ADR aceito diz Kafka, desenhe o que o ADR aceitou e registre a contradição em Conflitos e lacunas. Não reconcilie em silêncio, nem escolha a versão que parece mais bonita: quem resolve é `/hld-writer` ou `/adr-writer`.
- **Hipótese tracejada.** O que você completou porque o desenho precisava (um ator inferido de um papel, uma relação que um fluxo sugere sem nomear) leva a tag `hipotese`, que desenha a borda ou a linha tracejada e aparece na legenda, e entra na seção Hipóteses do `.md` com o trecho da fonte que a sugere. Tracejado é a forma de o leitor do diagrama, que não vai ler o `.md`, saber que aquilo não foi decidido. Se você está tracejando mais da metade de um diagrama, a fonte não sustenta aquele nível: pule.
- **Notas para o que o desenho não mostra**: invariantes, garantias, decisões que surpreendem. Até 5 bullets curtos com `•`, sem emoji, sem "ver seção X" (a origem fica no `.md`). Tipicamente uma ou duas notas por diagrama, não uma por elemento.
- **Fora do escopo fica fora.** O que a fonte marca como fora do escopo, descartado ou futuro não aparece, nem tracejado. Vai em Fora do escopo do `.md`.

## O `.md` de acompanhamento

Preencha `assets/template.md` sem mudar títulos nem ordem. Ele existe porque o diagrama não tem espaço para dizer de onde veio cada caixa, e quem for atualizar daqui a três meses precisa saber disso para não apagar uma decisão achando que era enfeite.

- **Cabeçalho** com a fonte e a versão dela no momento da geração (`Fonte: docs/architecture/hld.md versão 0.2.0`), os ADRs usados e a data. A versão é o que permite ao `make check-c4` avisar que os diagramas ficaram para trás.
- **Diagramas**: uma linha por nível C1 a C4, com o arquivo ou `pulado` e o motivo. Nenhum nível some sem explicação.
- **Origem dos elementos**: todo rótulo de todos os diagramas, com a seção da fonte e o ADR de onde veio. Elemento sem origem é fabricação até prova em contrário.
- **Hipóteses**, **Fora do escopo**, **Conflitos e lacunas**: nunca vazias; sem conteúdo, escreva "nenhuma" ou "nada ficou de fora".

## Atualização

Quando `<nome>.md` já existe:

1. Leia o `.md` e os `.puml` atuais e a fonte inteira. Compare a versão do cabeçalho com a atual da fonte e diga o que mudou entre elas que afeta os diagramas.
2. Mude só o que a fonte mudou. Mantenha aliases, nomes de arquivo e ordem dos elementos: o diff do `.puml` é o que o revisor do PR vai ler, e um diagrama reescrito do zero esconde a mudança de uma linha.
3. Elemento que saiu da fonte sai de todos os níveis e do `.md` de uma vez. Nível que passou a ter informação suficiente (ou deixou de ter) troca de gerado para pulado e vice-versa, com o motivo.
4. Atualize `Fonte ... versão`, `ADRs` e `Data`.

## Perguntas

O modo normal é direto: a fonte já tem as decisões. Pergunte só o que muda um diagrama inteiro e a fonte não responde, como o que é processo e o que é módulo, ou qual de dois containers equivalentes decompor no C3. Use `AskUserQuestion` com 2 a 4 alternativas concretas, a recomendada primeiro com "(Recomendado)" e o porquê ligado à fonte. A pergunta se explica sozinha: cite os componentes pelo nome, não "a proposta acima". Sem ninguém para responder, escolha a recomendação, marque como hipótese e liste no relatório com a alternativa descartada.

## Finalizar

1. **Revise contra a fonte.** Releia a fonte inteira e cada `.puml` escrito, procurando: elemento sem origem, elemento da fonte que sumiu sem ir para Fora do escopo, tecnologia ou versão diferente do ADR, relação no sentido errado, texto sem acento, termo técnico traduzido, detalhe de nível errado (tecnologia no C1, classe no C3). Corrija antes de validar; o validador pega a forma, não o conteúdo.
2. **Valide**: `python3 <skill-dir>/scripts/validate.py docs/architecture/diagrams` na raiz do repositório. Ele checa o esqueleto de cada `.puml`, a ordem de parâmetros, aliases soltos, elementos proibidos no nível, tags de hipótese, e no `.md` a lista de diagramas, a origem de cada elemento, as hipóteses e os ADRs citados; avisa quando a fonte mudou de versão ou quando um componente do HLD não aparece em lugar nenhum. Corrija até sair sem erro. Aviso de componente ausente se resolve desenhando ou explicando em Fora do escopo.
3. **Renderize só se pedirem**: `sh <skill-dir>/scripts/render.sh docs/architecture/diagrams` gera um SVG ao lado de cada `.puml`, pelo plantuml local, por `PLANTUML_JAR` com java, ou pela imagem docker fixada no script. Se o PlantUML acusar erro, corrija o `.puml` e rode de novo, até três vezes por arquivo; persistindo, reporte a mensagem. Sem motor disponível, diga como instalar. Não use o servidor público do PlantUML: ele recebe o texto do diagrama, e isso é publicar a arquitetura. Mesmo sem pedido de imagem, se houver motor, `render.sh --check` confere a sintaxe sem gerar arquivo.
4. **Reporte** em poucas linhas: fonte e versão, idioma, arquivos criados ou alterados, níveis pulados com motivo, hipóteses (as que mais mudam o desenho primeiro), conflitos entre fonte e ADRs, e o resultado da renderização ou da checagem de sintaxe, ou que ela não rodou e por quê.
