# Regras do contract.md

O contrato é a promessa testável da feature: o que qualquer pessoa, ferramenta ou agente pode exercitar para saber se o RF está pronto. Ele nasce dos critérios de aceitação do PRD, não das escolhas da spec, para que refatorar a implementação nunca mude o contrato. `assets/contract-template.md` é o esqueleto; este arquivo diz como preencher.

## Sumário

1. Ordem das seções
2. Quais critérios entram no manifesto
3. Pré-requisitos
4. Fecho de dependências e padrão de preparação
5. Gates de qualidade
6. Superfícies
7. Itens
8. Fundação
9. Antipadrões a recusar

## 1. Ordem das seções

1. `# Contrato: RF-NNN Nome` e, logo abaixo, a linha em itálico `*Gerado pela skill spec-writer. Edições à mão são sobrescritas na regeneração.*`. Nada de comentário HTML (`<!-- -->`) em lugar nenhum do arquivo: alguns visualizadores de markdown quebram com eles.
2. `## Pré-requisitos`, sempre a primeira seção.
3. `## Gates de qualidade`, quando há gates.
4. `## Manifesto de cobertura`.
5. Uma seção por superfície, na ordem do catálogo (seção 6).

## 2. Quais critérios entram no manifesto

No PRD deste repositório cada critério já mora no RF que o possui, então não há filtro de escopo a fazer: os critérios próprios do RF entram todos. A spec não adia critério do próprio RF. Se uma parte do RF deve esperar, isso é mudança de produto (o `/prd-writer` divide o RF em dois), não uma decisão da spec.

| Critério do PRD | Entra no manifesto deste RF? |
| --- | --- |
| Critérios de aceitação do próprio RF | Sim, todos |
| Integração `RF-X → RF-alvo` (este RF é o destino) | Sim: o alvo depende de X, então o teste cabe no fecho de dependências |
| Integração `RF-alvo → RF-Y` (este RF é a origem) | Não: vai para o contrato de Y, que depende deste |
| Transversais | Opcional, só quando o critério é verificável inteiro com este RF e o fecho dele |

A primeira coluna do manifesto é o **texto literal** do PRD, com o prefixo `RF-X → RF-alvo:` nos de integração. Não resuma nem corrija a redação: o `validate.py` compara letra por letra e é isso que permite saber, depois de uma revisão do PRD, que critério mudou. `python3 <skill-dir>/scripts/contexto.py rf RF-NNN` imprime a lista exata.

**Portão de cobertura.** Todo critério que entra precisa de pelo menos um ID de item na segunda coluna, e todo ID citado precisa existir. Se algum critério ficar sem item, não salve nada (nem spec, nem plano, nem contrato) e mostre:

```
erro: lacuna de cobertura no contrato do RF-NNN. Critérios sem item:
  - "<texto literal>"
Gere itens que os cubram, ou revise o PRD com /prd-writer se o critério não vale mais.
```

Os três arquivos são salvos juntos ou nenhum, para a pasta nunca ficar com spec de um jeito e contrato de outro.

Critério subjetivo ("a tela transmite confiança") ganha um item com `**Notas:** subjetivo; só revisão manual.`, em vez de ficar sem cobertura ou ganhar um teste fingido.

## 3. Pré-requisitos

Pré-requisitos são **condições que precisam valer antes de os itens rodarem**, escritas para o futuro: a implementação ainda não existe, então nada aqui é retrato do estado atual. Elas se leem de dois jeitos sem privilegiar nenhum: para quem constrói, são entregas a produzir junto com o código; para quem exercita o contrato depois, são condições a conferir antes de rodar. Nunca nomeie quem executa ("o agente implementador", "o avaliador", uma ferramenta específica): o contrato descreve comportamento, não quem o verifica.

Cinco subseções fixas, nesta ordem, cada uma omitida quando não tem entrada (sem "nenhum." de enfeite):

| Subseção | O que vai | O que não vai |
| --- | --- | --- |
| Serviços em execução | Processos que precisam estar no ar, pelo nome do componente do HLD | Como subir o processo |
| Estado persistido | Entidades, contas, linhas, mensagens, tokens que existem **dentro** do armazenamento ou da fila do sistema | Arquivos; comandos de seed |
| Entradas estáticas | Arquivos que os itens citam por caminho | Contas, linhas, sessões |
| Configuração | Variáveis, flags e mecanismos de teste lidos pelo sistema | Valores de segredo reais |
| Dependências externas | DEP-N e serviços de terceiro do fecho, e como são simulados | Serviços que o próprio sistema hospeda |

**Estado persistido e Entradas estáticas nunca se confundem.** Uma conta é estado persistido, nunca entrada estática; um vídeo é entrada estática, nunca estado persistido. Estado persistido é declarativo ("`exibidor-com-tela`: conta com papel exibidor e uma tela pública ativa com preço definido"), nunca operacional ("rode o seed X", "execute este SQL"): como criar é a convenção de seed do projeto que decide.

Formato das duas subseções com handle:

```
- `exibidor-com-tela`: conta com papel exibidor, um estabelecimento confirmado e uma tela pública ativa. Usado por: API-CONTRATACAO-01, E2E-CONTRATACAO-01
- `tests/fixtures/criativo-horizontal.mp4`: vídeo de 15 segundos em 1920x1080. Usado por: API-ENVIO-02
```

- Todo handle que um item cita no `Dado` ou no `Quando` tem declaração aqui, e é citado entre crases com o mesmo texto.
- Toda declaração tem `Usado por:` com pelo menos um item que existe e que de fato cita o handle. Declaração órfã é ruído que alguém vai tentar satisfazer à toa.
- Handle de entrada estática é um caminho; de estado persistido, um nome curto em minúsculas com hífen.

**Convenções do projeto, nunca inventadas.** O caminho das entradas estáticas, o mecanismo de seed, o arquivo de configuração de teste e o padrão de mocks vêm, nesta ordem de autoridade: dos contratos já existentes em `docs/features/*/contract.md`, da seção "Convenções para as features" da spec da fundação, e do código. Divergir de uma convenção existente exige uma linha em Decisões e hipóteses da spec dizendo por quê.

## 4. Fecho de dependências e padrão de preparação

Todo pré-requisito precisa ser satisfeito pelas entregas deste RF ou pelos RFs e DEPs do seu **fecho de dependências**: o RF, o que ele cita em `Depende de`, e o que esses citam, recursivamente. `contexto.py rf` imprime o fecho. RF fora do fecho não pode ser exigido, mesmo que seja da mesma onda ou "obviamente relacionado": o `Depende de` do PRD é a única fonte do que este RF pode supor. O `validate.py` trata como erro um contrato que cita RF fora do fecho.

Quando um critério descreve comportamento **deste** RF mas o teste natural precisaria de algo que só um RF fora do fecho constrói (autenticação, sessão, pagamento, armazenamento de arquivo), aplique o **padrão de preparação**:

1. Confirme que o critério é sobre a superfície deste RF. Se ele descreve, na verdade, a integração com o outro RF, ele não deveria estar neste RF no PRD: aponte ao usuário e sugira revisar com `/prd-writer`.
2. Trate o que falta como um stub, override ou flag que **este** RF entrega como parte do próprio escopo.
3. Escreva o pré-requisito em torno desse mecanismo interno, nunca do estado real que o outro RF produziria.

Exemplo. Suponha que RF-009 Localizar telas no mapa (fecho: RF-001, RF-002, RF-008, RF-017) tenha o critério "anunciante logado vê o botão de contratar no balão da tela", e que o login seja um RF à parte do qual o mapa não depende. A sessão de anunciante logado vem do login, que não está no fecho. Errado: declarar `anunciante-logado: anunciante com sessão válida` em Estado persistido, porque isso exige o login implementado. Certo: em Configuração, "a verificação de sessão usada pelo mapa aceita um modo de teste que a coloca como anunciante autenticado; esse modo é entrega do RF-009". O RF-009 implementa o comportamento real e o mecanismo de teste, e o contrato roda só com ele e o fecho.

Preparar o terreno para outro RF (expor um ponto de extensão, um stub que alguém vai substituir) não faz desse outro RF uma dependência, e os pré-requisitos refletem essa fronteira.

## 5. Gates de qualidade

Os comandos que precisam passar para a feature contar como pronta. Neste harness o gate central é `make check`, que roda tudo e é exatamente o que a CI roda; `make build` entra quando `scripts/build.sh` existe, porque não faz parte de `make check`.

```
## Gates de qualidade

Cada gate precisa passar para a feature ser considerada pronta.

- **check**: `make check`. Todas as verificações do repositório passam, as mesmas da CI.
- **build**: `make build`. O artefato da stack é gerado sem erro.
```

O parágrafo de abertura descreve comportamento, não quem executa: nada de "o avaliador roda", de "para no primeiro erro" ou de ordem de execução. Sem gate nenhum (usuário recusou e não ditou outros), a seção some inteira, sem placeholder.

## 6. Superfícies

| Seção | Código | Quando existe |
| --- | --- | --- |
| `## Serviço` | SVC | Só com consumidor real fora desta feature (outro RF, outro processo), nomeado numa linha `Consumidor:` logo abaixo do modo de verificação |
| `## API HTTP` | API | O RF expõe ou muda endpoint HTTP |
| `## CLI` | CLI | O RF expõe comando de linha de comando |
| `## UI` | UI | O RF tem tela ou interação visual |
| `## Worker` | WRK | O RF tem processamento assíncrono, agendado ou de fila |
| `## Evento` | EVT | O RF publica ou consome evento que outro componente observa |
| `## E2E` | E2E | Jornada que atravessa mais de uma superfície |

Detecte as superfícies pelo fluxo principal do RF, pelas interfaces da linha dele na rastreabilidade do HLD e pela spec. Cada seção começa com `Modo de verificação: ...`, dizendo como a superfície é exercitada, sem nomear ferramenta ou executor.

**Toda superfície tem mecanismo decidido antes do código.** A ferramenta não entra no contrato; ela mora na tabela `Verificação por superfície` da Estratégia de testes da spec, uma linha por seção de superfície do contrato, com a Decisão que a sustenta:

| Decisão | Quando |
| --- | --- |
| `ADR-NNNN` | O mecanismo depende de ferramenta da stack (driver de navegador, cliente de fila) e um ADR aceito a escolheu |
| `não precisa` | Mecanismo genérico, sem ferramenta a escolher: requisição HTTP, comando, consulta ao banco. Nunca em UI ou E2E: dirigir navegador exige ferramenta |
| `fundação` | Num RF, a linha da spec da fundação vale para esta superfície |
| `pendente de ADR` | Ninguém decidiu ainda. O item entra também em "Pendentes de ADR" da spec, e a `/implement-feature` bloqueia até a `/adr-writer` registrar |

Adiar a ferramenta ("escolhida no primeiro RF com tela") e mesmo assim gerar itens da superfície deixa esses itens bloqueados desde o nascimento, e eles só aparecem como bloqueados depois de toda a implementação. O `validate.py` recusa superfície sem linha, UI ou E2E com `não precisa` e pendência que não aparece em "Pendentes de ADR".

**Regra de admissão do Serviço.** `## Serviço` não é lugar de testar classe, value object, entidade ou helper: isso é teste unitário, orientado pela Estratégia de testes da spec. Só entra quando um consumidor fora desta feature chama aquilo diretamente.

Subtítulos `###` dentro da superfície usam o **vocabulário da capacidade** ("Contratação de espaço", "Crédito por conflito"), nunca o da entidade da superfície (`### POST /v1/campanhas`, `### Tela /mapa`). O endpoint aparece dentro do item.

## 7. Itens

```
#### API-CONTRATACAO-01
- **Dado:** `exibidor-com-tela` com 2 espaços livres na semana contratada.
- **Quando:** o anunciante contrata 1 espaço nessa tela para essa semana.
- **Então:**
  - a resposta é 201 com a campanha no estado aguardando moderação
  - a disponibilidade da tela na semana passa a 1 espaço
- **Notas:** opcional.
```

- ID `<SUPERFÍCIE>-<CAPACIDADE>-<NN>`, sem número de RF (a pasta já diz qual é). Capacidade em maiúsculas sem acento, uma ou duas palavras. Único no arquivo, e o código da superfície bate com a seção onde o item está.
- `Dado`, `Quando` e `Então` nessa ordem; `Notas` só quando precisa.
- `Dado comum:` logo abaixo do `###` evita repetir a mesma condição em todos os itens da capacidade.
- **Todo item roda no ambiente local efêmero.** Nada no `Dado` ou no `Quando` exige PR, push, run do workflow ou da CI: a `/implement-and-evaluate` só abre o PR depois de uma avaliação limpa, então um item assim nunca passa. A CI é conferida no Fechamento dela; o que o contrato quer garantir do workflow vira item local (`CI=true make check` passa, o arquivo do workflow tem o passo). O `validate.py` recusa.
- **Comportamento de ferramenta externa se confere antes de virar promessa.** Um `Então` que depende do que uma CLI ou um gerador faz ("nenhuma migração nova é gerada") é conferido na doc oficial ou num teste no scratchpad com a versão do ADR, e a fonte vai em Decisões da spec. Um ORM que gera migração vazia numa versão específica faz o item reprovar sem nenhum código errado.

Quatro freios no `Então`:

1. **Coesão de superfície**: as observações são da superfície da seção. O que só se vê em outra superfície vai num item dessa outra.
2. **Ação atômica**: o `Quando` é uma ação. Duas ações são dois itens, ou um item E2E.
3. **Até uns 5 bullets**: passou disso, há dois comportamentos no item; acima de 10 é erro do validador.
4. **Bullet atômico**: uma observação por linha. "a resposta é 201 e o saldo cai" são duas linhas.

## 8. Fundação

O contrato da fundação não tem critérios do PRD, porque a fundação não é RF. O manifesto lista, como primeira coluna, o texto literal de cada item de `Incluído` do Escopo da spec da fundação, e a regra de cobertura é a mesma: cada entrega com pelo menos um item. Os itens provam que a base existe e funciona (o projeto sobe, a migração inicial aplica, `make check` passa com os scripts da stack, o mecanismo de seed e de configuração de teste funciona), não comportamento de produto. O fecho de dependências da fundação é vazio: ela não pode exigir nenhum RF.

## 9. Antipadrões a recusar

- `Então` que repete o `Quando` ("o anunciante contratou o espaço").
- Item por classe, por value object, por helper, por arquivo de teste.
- Passo operacional no `Dado` ("rode a migração", "chame o seed").
- Observação de processo em vez de comportamento ("o teste passa", "a função é chamada").
- Linha do manifesto com "Coberto por" vazio, ou critério reescrito em vez de literal.
- Handle citado num item sem declaração em Pré-requisitos, ou declaração sem item que a use.
- Pré-requisito que exige RF fora do fecho de dependências.
- `Dado` ou `Quando` que exige PR, push ou run da CI.
- `Então` sobre comportamento de ferramenta externa que ninguém conferiu na doc ou num teste.
- Seção de superfície sem linha em `Verificação por superfície` da spec, ou com ferramenta adiada.
- Tabela "critério → teste" dentro do spec.md: o manifesto do contrato é a única fonte dessa ligação.
- Comentário HTML, travessão "—" ou nome de quem executa em qualquer parte do arquivo.
