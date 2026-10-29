# Fase: briefing do subagente e commit

## Sumário

1. Briefing do subagente
2. O que o subagente faz
3. Falhas
4. Retorno
5. Commit

## 1. Briefing do subagente

O subagente só sabe o que o briefing diz e o que ele lê. Copie o bloco abaixo, preencha os colchetes e mande inteiro. As regras (seções 2 e 3) e o formato do retorno (seção 4) ficam neste arquivo, e o subagente os lê daqui: colá-los em cada prompt repetia o mesmo texto a cada fase, e a cópia colada envelhecia quando o arquivo mudava.

```
Você implementa a fase [N] de [M] do plano de [RF-NNN Nome | fundação] neste repositório.
Pasta da feature: [docs/features/<pasta>/]

Fase [N]: [título]
[passos da fase, copiados do plan.md com a numeração]

Fases anteriores (já no working tree ou commitadas):
[por fase: título, arquivos principais criados, desvios que afetam esta fase; ou "nenhuma"]

Pré-requisitos do contrato que esta fase deve produzir, quando for ela que cria o lugar deles:
[handles de Estado persistido, caminhos de Entradas estáticas e linhas de Configuração da ficha;
 ou "nenhum nesta fase"]

Leia antes de editar:
1. plan.md inteiro, para saber o que é desta fase e o que é das próximas.
2. spec.md: as seções que esta fase toca (Componentes, Contratos de interface, Modelo de dados,
   Tratamento de erros, Estratégia de testes) e Regras e fluxos. A spec manda na estrutura.
3. contract.md inteiro: Pré-requisitos e todos os itens. Os itens mandam no comportamento
   observável (status, corpo, efeito persistido, código de erro, texto da tela).
4. [Num RF: docs/features/fundacao/spec.md, seção "Convenções para as features".
    Na fundação: a seção dela mesma.] É onde estão seed, fixture, configuração de teste e mocks.
5. CLAUDE.md e, quando a fase mexer em comando ou ambiente, CONTRIBUTING.md.
Abra o código existente sob demanda, quando a fase precisar dele; não varra o repositório.

Antes de editar, leia as seções 2, 3 e 4 de .claude/skills/implement-feature/references/fase.md:
o que você faz e não faz, como tratar falhas e o formato exato da resposta. Elas valem como
parte deste briefing.
```

## 2. O que o subagente faz

**Implementa os passos da fase, e só eles.** Passo de fase seguinte não se adianta: a fase seguinte vai ler o plano e esperar encontrar o terreno como o plano descreve.

**Desempate entre contrato e spec.** Quando a spec e um item do contrato falam da mesma coisa observável de fora e discordam, siga o item e registre "spec dizia X, item ID exige Y, segui Y". Estrutura interna (caminho, nome de classe, decomposição, coluna que nenhum item observa) segue a spec. Quando a realidade diverge (coluna com outro nome, arquivo noutro caminho), adapte o mínimo e registre. Divergência pequena não para a fase.

**Produz os pré-requisitos com a convenção do projeto.** Estado persistido vira factory ou seed no lugar que as Convenções indicam, com o handle no nome; entrada estática vira arquivo no caminho exato do contrato, com a propriedade que ele declara (duração, formato, chave que não está no JWKS); configuração vira chave no arquivo de configuração de teste, sem segredo real. O contrato descreve o que precisa ser verdade, não como criar: o como é da convenção.

**Escreve os testes que a Estratégia de testes da spec pede** junto do código da fase, no lugar e no nível que ela indica. Teste acompanha o passo; não existe fase de testes.

**Valida pelo `Makefile`.** `make lint` e `make test` ao fim da fase; `make build` quando a fase mexe no que é compilado. Na fase que cria os `scripts/<alvo>.sh`, eles passam a valer a partir daí; antes disso o alvo avisa e passa, e isso não é validação. Quando a fase cria uma superfície (rota, migração, comando, worker, tela), exercite-a uma vez de verdade: suba o que for preciso, chame a rota, rode a migração, abra a tela. Tela se confere num navegador, com a ferramenta da tabela "Verificação por superfície" da spec; sem ferramenta decidida, registre como pendência, não como feito.

**Documentação do repositório.** Se a fase muda um comando, uma variável de ambiente ou o jeito de subir o projeto, atualize `README.md` ou `CONTRIBUTING.md` na mesma fase. Se o que você construiu contradiz o HLD ou um ADR (um componente que precisou existir, uma interface que não cabe), não edite: registre em Pendências com a skill dona (`/hld-writer`, `/adr-writer`).

**Dependência nova se declara.** Toda dependência que entra num manifesto da stack (de produção ou de desenvolvimento: um runner de script conta) vai em "Dependências novas" com o que a sustenta, um ADR aceito ou a seção da spec que a cita. Sem nenhum dos dois, escreva `sem cobertura`: quem orquestra pergunta à pessoa antes do commit. Biblioteca de produção ou ferramenta que muda a arquitetura sem cobertura não se instala: é o caso de `precisa de decisão` abaixo.

**Divergência do contrato se registra, não se contorna.** Quando um item do contrato contradiz o que a ferramenta da stack faz (a CLI gera o que o item diz que não gera, a biblioteca não expõe o que ele exige), não ajuste código nem teste para fingir que passa: registre em "Divergências do contrato" com o ID, o que a ferramenta faz e a evidência (comando e saída), e siga com o resto da fase. Quem orquestra decide com a pessoa na hora, em vez de o item reprovar depois de toda a implementação.

**Pare e devolva, sem improvisar,** quando a fase pedir tecnologia que nenhum ADR aceito nem a spec preveem, quando um passo for impossível como escrito, ou quando faltar decisão de produto. Devolva o status `precisa de decisão` com a pergunta pronta, as alternativas e a sua recomendação.

**Não faz:** commit, `git add`, criação de branch, edição de `docs/product/`, `docs/architecture/` ou da pasta `docs/features/` da feature, nem stub em código de produção.

## 3. Falhas

| Tipo | O que é | O que fazer |
|---|---|---|
| Real | Lint, tipos ou teste falham por código desta execução | Ler o erro, corrigir, rodar de novo. Até 3 tentativas; depois, status `falhou` com o erro |
| Do ambiente | A validação não consegue rodar aqui (Docker parado, credencial externa ausente, comando inexistente) | Não conta como tentativa. Registrar com o comando e a mensagem e seguir com o que dá |
| Anterior | Falha que já existia antes desta execução, em código que ela não tocou | Não conta como tentativa e não se corrige aqui. Registrar com a evidência (falha também sem as mudanças da fase) |
| Ambiente caiu | Serviço da máquina que funcionava e parou no meio da fase (daemon do Docker, VM, banco local) | Uma checagem (`docker info` ou equivalente). Sem tentar reiniciar e sem esperar: devolva `ambiente caiu` com o comando, a mensagem e o que da fase ficou feito. Recuperar a máquina é da pessoa |

Aviso sem código de saída diferente de zero não é falha.

## 4. Retorno

```
Status: pronta | falhou | precisa de decisão | ambiente caiu
Arquivos: <diretórios tocados, com a contagem de arquivos: "apps/api/src/ (14)"; a lista exata sai do git status>
Pré-requisitos produzidos: <handle ou caminho: onde ficou>
Validação: <comando: resultado, para cada comando rodado>
Superfícies exercitadas: <o que foi chamado ou aberto e o que se observou>
Desvios: <desempates e adaptações, um por linha>
Dependências novas: <nome@versão: ADR-NNNN | spec, <seção> | sem cobertura>, ou "nenhuma"
Divergências do contrato: <ID: o que a ferramenta faz de diferente; evidência>, ou "nenhuma"
Falhas do ambiente: <comando: mensagem>
Falhas anteriores: <teste: evidência>
Pendências: <o que ficou por fazer, ou divergência com HLD/ADR e a skill dona>
Pergunta: <só com status "precisa de decisão": pergunta, alternativas, recomendação>
```

## 5. Commit

Feito por você, o orquestrador, só com a autorização do Passo 1 e depois de conferir a validação. Para o formato, veja `CONTRIBUTING.md` seção "Mensagens de commit": tipo e escopo em inglês, descrição em português, em minúsculas, no imperativo, sem ponto final e com até 72 caracteres no cabeçalho. O hook `commit-msg` confere.

```
feat(<escopo>): <o resultado da fase, como no título do plano>

Fase <N> de <M> do plano de <RF-NNN | fundação>: passos <a> a <b>.
<desvio que quem revisa precisa saber, se houver>

Refs: <RF-NNN | fundacao>
Plan-Phase: <N>
```

**Fase em partes.** Quando uma fase precisa ser commitada em mais de um commit (uma decisão parou parte dela, um pedaço independente ficou pronto antes), as partes levam `Plan-Step: <a>-<b>` (ou `3,5-6`) no lugar de `Plan-Phase`, e só o commit que fecha a fase leva `Plan-Phase: <N>`. O `preparar.py` mostra a fase como `parcial` com os passos que faltam, e a retomada despacha só esses.

- **Tipo**: `feat` para o comportamento do RF; na fundação, pelo conteúdo da fase (`build` para monorepo e ferramentas, `feat` para a API que passa a responder, `ci` para workflow).
- **Escopo**: o componente ou pacote principal da fase, em inglês e minúsculas (`api`, `worker`, `database`, `web`, `monorepo`).
- **Rodapés**: `Refs:`, `Plan-Phase:` e `Plan-Step:` são o que o `preparar.py` lê para pular fases e passos já feitos numa retomada. Sem eles a retomada refaz a fase.
- Adicione os arquivos pelo nome, a partir do `git status --porcelain`, conferindo que cada um está num diretório que o retorno declarou. Arquivo fora deles, ou que não é desta fase, fica fora do commit.
- Hook falhou: corrija a mensagem e faça um commit novo. Nunca use `--no-verify` nem `--amend` num commit que não é desta execução.
