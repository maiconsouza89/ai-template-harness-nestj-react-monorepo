# Descoberta, entrevista e checagem

## Sumário

1. Descoberta no código
2. O que a entrevista pergunta, e o que nunca pergunta
3. Blocos da entrevista
4. Defaults sem ninguém para responder (modos Direto e Lote)
5. Antes de gerar

## 1. Descoberta no código

Antes de qualquer pergunta, leia o código. Com código, a descoberta é obrigatória e não espera o usuário apontar caminhos. Sem código, a fonte das convenções é a spec da fundação (ver `references/fundacao.md`).

**Camada 1, o piso.** No mínimo, anote o padrão observado em cada item, com um caminho de exemplo:

- Linguagem, runtime e framework, conferidos contra os ADRs aceitos. Código que contradiz ADR aceito vai para o relatório; não escolha um lado em silêncio.
- Estrutura de pastas e nomes: onde fica um módulo de domínio, um controller, um handler de fila, uma tela.
- Acesso a dados: ORM ou SQL, onde ficam esquema e migrações, como se nomeiam.
- Autenticação e autorização: como a borda valida identidade e papel.
- Estilo de entrada (REST, eventos, filas, CLI) e formato de resposta e de erro.
- Validação de entrada.
- Tratamento de erro (exceção, Result, código de erro).
- Testes: framework, pastas, estilo de unidade e de integração.
- **Seed de estado persistido** (alimenta Estado persistido do contrato): factories, seeds, hooks de setup.
- **Caminho de entradas estáticas** (alimenta Entradas estáticas): `tests/fixtures/`, `__fixtures__/` ou outro; por app ou na raiz.
- **Configuração de teste** (alimenta Configuração): `.env.test`, `config/test/` ou equivalente.
- **Mocks de dependência externa** (alimenta Dependências externas): onde ficam e como se ligam.

Para os quatro últimos, os contratos já gerados em `docs/features/*/contract.md` e a seção "Convenções para as features" da fundação têm autoridade sobre o que você deduzir do código: foi o que o projeto combinou.

**Camada 2, além do piso.** Anote qualquer outro padrão que muda como esta feature deve ser escrita: abstrações recorrentes, logging e tracing (o HLD diz o que medir), configuração, i18n, acessibilidade, convenções de commit por módulo. Num projeto médio, 8 a 15 padrões é o normal. O piso é piso, não teto.

**Specs anteriores.** Leia as `spec.md` dos RFs do fecho de dependências: elas dizem por qual interface e com que formato chega o que este RF consome (a seção Saídas delas é a Entradas desta).

## 2. O que a entrevista pergunta, e o que nunca pergunta

Nunca pergunte o que já está respondido em:

- O PRD: fluxo, exceções, erros previstos, critérios, regras de produto, requisitos não funcionais.
- O HLD: componente responsável, interface, fluxo técnico, entidade, metas.
- Um ADR aceito: tecnologia e padrão. ADR aceito não se reabre; mudar é ADR novo via `/adr-writer`.
- O código e as specs anteriores: padrões da descoberta.

Pergunte o que nenhum deles decide: assinatura dos endpoints novos, colunas, índices e constraints, nomes de arquivos novos, regra de validação que o RF não detalha, caso de borda fora dos erros previstos, escolha entre dois padrões conflitantes no código, e o detalhe que o PRD menciona sem fixar (o RF diz "em lotes" sem dizer o tamanho). Esse último se pergunta: não se assume.

Tecnologia nova que nenhum ADR cobre (uma biblioteca de upload resumível, um motor de PDF) não se decide na spec: vira pergunta com as alternativas e, decidida ou não, entra em "Pendentes de ADR" para o `/adr-writer` registrar.

## 3. Blocos da entrevista

Um bloco por vez, no formato de "Como perguntar" do `SKILL.md`. Pule o bloco que o material já responde.

| Bloco | Pergunta |
| --- | --- |
| 1. Gates e superfícies | Os gates detectados (normalmente `make check`, e `make build` se `scripts/build.sh` existe) e as superfícies do contrato que o RF sugere. "Detectei estes gates e estas superfícies; mantém?" com as correções mais prováveis como alternativas |
| 2. Componentes e arquivos | Onde no código cada componente do HLD ganha esta feature, quando o padrão admite mais de um lugar |
| 3. Interfaces | Endpoints, eventos ou comandos novos: forma do recurso, paginação, idempotência, códigos de erro |
| 4. Dados | Entidades novas ou alteradas, constraints que garantem as regras do RF (unicidade, não negativo), estratégia de migração |
| 5. Lacunas do RF | Detalhes que o PRD menciona sem fixar e casos de borda fora dos erros previstos |
| 6. Convenções de teste | Só se nem a fundação nem o código as definem: onde ficam fixtures, como se faz seed, que arquivo de configuração de teste |

Depois de cada bloco, resuma em 3 a 6 linhas só o que foi decidido e siga.

## 4. Defaults sem ninguém para responder (modos Direto e Lote)

Sem interação, cada decisão que a entrevista faria recebe o default abaixo, marcado `(hipótese)` na linha onde é tomada e listado no relatório com a alternativa descartada.

| Decisão | Default |
| --- | --- |
| Decisão técnica com recomendação clara | A recomendação |
| Padrões conflitantes no código | O mais frequente; empate, o mais recente |
| Tecnologia nova sem ADR | A opção mais simples que atende, em "Pendentes de ADR"; nunca escolha silenciosa |
| Detalhe que o PRD menciona sem fixar | Valor usual de mercado para o caso, marcado como hipótese |
| RF vago, com muitas decisões abertas | Defaults por decisão, cada um marcado; nunca inferência silenciosa |
| Código não vazio sem padrão reconhecível | Boas práticas da stack dos ADRs, marcadas |
| Superfícies ambíguas | Toda superfície com algum sinal no RF, no HLD ou na spec |
| Gates detectados | Todos entram; o relatório lista |
| Nenhum gate detectado | Seção omitida; o relatório diz que não havia gate |
| Convenção de teste inexistente | O padrão mais comum da stack dos ADRs (ex.: `tests/fixtures/`), marcado; o próximo RF reusa |

Uma marca por decisão, no lugar onde ela é tomada; passou de 20 numa spec, você está decidindo demais pelo usuário e isso vai no relatório em destaque.

## 5. Antes de gerar

O `validate.py` confere a forma. Antes dele, confira o conteúdo:

- Toda regra de Regras e fluxos vem do RF, de uma decisão de produto ou de um requisito não funcional; nada inventado.
- Todo erro previsto do RF tem linha em Tratamento de erros.
- Todo componente da spec é da tabela do HLD, e os da linha do RF na rastreabilidade do HLD aparecem na spec, ou o relatório diz por que não.
- O que o RF lê das dependências (os itens `dado` do `Depende de`) aparece em Entradas, com a interface pela qual chega.
- O plano não tem fase de testes, estimativa de tempo, nem detalhe de implementação (tipo, coluna, método): isso é da spec.
- A spec não tem código, só estrutura; JSON de exemplo e descrição de migração são estrutura.
- Cada item do contrato observa comportamento da superfície, e cada handle tem declaração e uso.
- Toda regra com número em Regras e fluxos (limite, prazo, tamanho, contagem) tem item no contrato que a exercita, inclusive no caso de borda que a regra menciona ("requisição anônima", "token inválido"). Regra sem item fica fora da avaliação: um limite por IP sem item só aparece quando uma revisão de segurança o pega.
- Toda seção de superfície do contrato tem linha em `Verificação por superfície`, e todo `Então` sobre ferramenta externa foi conferido (`references/contrato.md` seção 7).
- Nenhum pré-requisito exige algo fora do fecho de dependências; onde exigiria, o padrão de preparação foi aplicado.
