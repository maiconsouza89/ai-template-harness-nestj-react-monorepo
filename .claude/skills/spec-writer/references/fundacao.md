# Spec da fundação

A fundação é o trabalho que nenhum RF possui e todos precisam: esqueleto do projeto, banco com a migração inicial, autenticação na borda, configuração e segredos, observabilidade mínima e os scripts do contrato da stack (`scripts/lint.sh`, `format.sh`, `test.sh`, `build.sh`, que o `Makefile` chama via `scripts/contract.sh`). O PRD não a lista porque ela não é produto; ela sai do HLD e dos ADRs aceitos. Pasta: `docs/features/fundacao/`, com os mesmos três arquivos.

## Quando gerar

`python3 <skill-dir>/scripts/contexto.py estado` mostra se a spec da fundação existe e quais scripts da stack estão presentes. O sinal de que a fundação foi **implementada** é ter os scripts da stack e os artefatos que os componentes de infraestrutura do HLD exigem (esquema ou migração do banco, módulo de autenticação, ponto de entrada de cada processo). Não use pasta `src/` ou arquivo de manifesto como sinal: qualquer gerador de projeto cria isso, e a fundação pode continuar por fazer.

| Situação | O que fazer |
| --- | --- |
| Sem código, sem spec da fundação, pedido de um RF | Avise: "o projeto ainda não tem base; a spec da fundação define a estrutura e as convenções de teste que os contratos vão usar". Pergunte se gera a fundação antes (recomendado) ou segue com o RF assim mesmo |
| Spec da fundação existe, fundação não implementada, pedido de RF | Siga com o RF, citando a fundação em Pré-requisitos do plano, e use as convenções dela |
| Fundação implementada | Nada a avisar; o código passa a ser a referência, e a spec da fundação, o histórico |
| Pedido explícito da fundação | Gere |
| Sem HLD | Pare: a fundação sai do HLD. Diga que `/hld-writer` gera um |

## O que a spec da fundação tem

Mesmo template da spec de RF, com três diferenças:

- Título `# Spec: fundação`, sem linha de PRD obrigatória (inclua a versão do PRD lida, se existir), com a linha `HLD:` obrigatória.
- **Escopo, Incluído**: uma entrega por linha, cada uma ligada a um componente do HLD ou a um ADR ("Banco: PostgreSQL com PostGIS e a migração inicial vazia aplicável (ADR-0003)"). Esses textos são a primeira coluna do manifesto do contrato.
- Uma seção a mais, **`## Convenções para as features`**, antes de Decisões e hipóteses, com estas linhas, cada uma com caminho concreto:
  - Estrutura de pastas: onde fica um módulo de domínio, uma tela, um handler de fila.
  - Testes: framework e pastas de unidade, integração e ponta a ponta.
  - Estado persistido: o mecanismo de seed ou factory e onde vive.
  - Entradas estáticas: a pasta de fixtures.
  - Configuração de teste: o arquivo ou esquema que o runner lê.
  - Dependências externas: onde ficam os mocks e como se ligam.

É essa seção que torna os contratos dos RFs consistentes entre si: cada RF reusa o que está aqui, e divergir exige justificativa na spec do RF.

A tabela `Verificação por superfície` da Estratégia de testes da fundação é a que os RFs herdam com a Decisão `fundação`. Se o projeto vai ter tela, a ferramenta de navegador se decide aqui (ADR ou `pendente de ADR`), mesmo que a fundação só tenha uma rota inicial: é ela que fixa o mecanismo de todos os RFs com UI.

**CI.** A entrega "CI" do Escopo é coberta por itens locais: `CI=true make check` passa, o workflow instala o que o projeto exige e só usa actions fixadas por SHA (`make check-actions`). O run de verdade no GitHub fica no Fechamento da `/implement-and-evaluate`, que espera os checks do PR.

## Compatibilidade da stack

A fundação junta, pela primeira vez, todas as ferramentas dos ADRs aceitos, e dois ADRs aceitos juntos podem não funcionar juntos: um ADR fixa a versão maior de um compilador e outro escolhe um gerador que importa uma API que essa versão removeu. Sem conferir antes, a falha só aparece num passo avançado do plano.

Antes de gerar o plano, para cada ferramenta com versão fixada por ADR, leia nos metadados do registro (`npm view <pacote>@<versão> peerDependencies engines`, ou o equivalente da linguagem) o que ela exige e cruze com as versões dos outros ADRs e com as restrições que eles declaram ("ferramenta que importa X fica de fora"). Conflito: pare antes de escrever os três arquivos e aponte a `/adr-writer` (supersede ou ADR de exceção), com a ferramenta, a versão e a exigência que não fecha. Sem conflito, registre em Decisões da spec que a conferência foi feita, com a data.

## O que a fundação não faz

- Não implementa comportamento de RF nenhum, nem parcial. Tela de login entra só se o HLD a coloca na borda de autenticação como infraestrutura, e mesmo assim sem regra de produto.
- Não decide tecnologia: o que não tem ADR aceito vai para "Pendentes de ADR" e para o `/adr-writer`. A fundação é o momento em que essas pendências mais aparecem (framework de teste, ORM, ferramenta de migração); listá-las é parte da entrega.
- Não mexe no `Makefile` nem no `CLAUDE.md`: o contrato da stack existe para que a stack entre só por `scripts/<alvo>.sh`.
- Não muda o roadmap: a fundação não é RF.
