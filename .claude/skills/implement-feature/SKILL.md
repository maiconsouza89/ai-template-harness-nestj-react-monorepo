---
name: implement-feature
description: Implementa um RF-NNN (ou a fundação) a partir de `spec.md`, `plan.md` e `contract.md` em `docs/features/RF-NNN-nome/`, fase por fase do plano, cada fase num subagente, produzindo junto os pré-requisitos do contrato (seed, fixture, configuração de teste), validando com o `Makefile` e, com autorização dada no início, fazendo um commit por fase num branch `feat/...`. Termina com os gates do contrato, a conferência de componentes e pré-requisitos, a prontidão preliminar de cada critério do manifesto e o próximo passo `/evaluator`, que dá o veredito. Use sempre que o usuário quiser implementar, codar, construir ou "tirar do papel" um requisito já especificado ("implementa o RF-003", "bora codar a fundação", "executa o plano do RF-002", "começa a implementação"), mesmo sem dizer implement-feature; ou quando a spec acabou de ser gerada e ele perguntar o que vem depois.
---

# Implement Feature

A skill transforma o trio que a `/spec-writer` gerou em código: **o plano diz a ordem, a spec diz a estrutura e o contrato diz o comportamento que precisa ser verdade no fim**. Ela constrói e prepara o terreno; quem dá o veredito é a `/evaluator`, que exercita cada item do contrato com contexto limpo. Separar as duas existe porque quem implementou tende a confirmar a própria obra.

Ela não reabre nada do que veio antes. PRD, HLD, ADRs, spec, plano e contrato são entrada: não se editam aqui, nem para corrigir divergência. Quando a realidade discorda deles, a skill adapta o mínimo, registra e aponta a skill dona do documento.

## Modos

| Alvo | Modo |
|---|---|
| `RF-003`, `3`, nome do RF, caminho da pasta ou de um arquivo dela | **RF** |
| `fundação`, `fundacao` ou `docs/features/fundacao/` | **Fundação**: igual ao RF, sem roadmap e sem dependências de RF; ela é quem cria os `scripts/<alvo>.sh` da stack |

Um alvo por execução. Uma onda inteira vira várias execuções, uma por RF, cada uma no seu branch: o PR de cada RF precisa ser revisável sozinho.

## Passo 0: preparar

Na raiz do repositório:

```
python3 <skill-dir>/scripts/preparar.py <alvo>
```

O script resolve a pasta, roda o `validate.py` da spec-writer e o `contexto.py` dela, e imprime a ficha da execução: bloqueios, avisos, branch, working tree, fases (com as já commitadas neste branch), pré-requisitos do plano e do contrato, gates, superfícies, pendentes de ADR da spec e ADRs aceitos. Use essa ficha em vez de recortar os documentos à mão.

**Bloqueios param a execução** antes de qualquer código, cada um com o próximo passo:

| Bloqueio | Por quê | Próximo passo |
|---|---|---|
| Pasta sem os três arquivos, ou `validate.py` com erro | Spec e contrato fora de forma geram código para o alvo errado | `/spec-writer` (Revisão) |
| Dependência do fecho não `feito` no roadmap | O código que este RF consome ainda não existe; implementar contra o vazio inventa a interface | Implementar a dependência, ou corrigir o roadmap se ela já está pronta |
| RF com a fundação não implementada | Sem a base, cada RF inventaria a sua | `/implement-feature fundação` |
| RF `bloqueado` no roadmap | Quem marcou sabe de algo que a skill não sabe | Resolver o motivo da Observação |

Depois, por julgamento seu (o script não decide):

- **Pendentes de ADR.** Para cada item que a ficha lista, procure um ADR aceito que o cubra. Sem ADR, é bloqueio: código sobre tecnologia sem registro torna a decisão cara de reverter sem que ninguém a tenha registrado (regra do `CLAUDE.md`). O próximo passo é `/adr-writer`.
- **Pré-requisitos do plano** (Docker, conta de serviço): confira o que é conferível na máquina (`docker compose version`). Faltou: bloqueio, com o que instalar.

Só siga com bloqueio se a pessoa mandar explicitamente, e registre isso no relatório.

## Passo 1: branch e autorização

Invocada pela `/implement-and-evaluate`, este passo já foi respondido na pergunta dela: use as respostas que vieram e não pergunte de novo. A ficha do `preparar.py` também já veio do Passo 0 dela: não rode o script de novo. Sozinha, faça uma chamada de `AskUserQuestion`, com até três perguntas, só as que se aplicam:

1. **Branch.** Na `main`, proponha o nome que a ficha sugere (`feat/rf-002-cadastrar-tela`, `feat/fundacao`) e crie a partir da `main` depois do ok. `main` só recebe PR com squash, e `make check-branch` falha nela. Fora da `main`, siga no branch atual.
2. **Commits.** "Posso commitar ao fim de cada fase validada?" Recomendado: sim, porque o commit por fase permite revisar e retomar. O `CLAUDE.md` exige autorização explícita, e ela vale só para esta execução. Com não, tudo fica no working tree e a retomada depende da pessoa.
3. **Working tree com alterações** fora de commit e alheias ao alvo: seguir (os commits só pegam os arquivos de cada fase), ou parar para a pessoa guardar o trabalho.

Retomada: fases que a ficha mostra como commitadas são puladas, e de uma fase `parcial` só se despacham os passos que faltam. Diga quais.

Se o RF está `pendente` no roadmap, passe para em andamento:

```
python3 .claude/skills/prd-writer/scripts/roadmap.py set RF-NNN "em andamento" --motivo "implementação em <branch>"
```

## Passo 2: uma fase por subagente

Você orquestra; quem escreve código são os subagentes. Assim o contexto principal continua pequeno numa fundação de 20 passos, e cada fase começa limpa, lendo os documentos de novo em vez de depender de memória comprimida.

Para cada fase por fazer, em ordem:

1. **Despache** um subagente `general-purpose` com o briefing de `references/fase.md` preenchido: pasta, número e título da fase, passos, resumo das fases anteriores (arquivos criados, desvios) e as entradas estáticas e configurações que a fase deve produzir. Fases dependem umas das outras: nunca em paralelo.
2. **Confira o retorno.** O subagente devolve status, diretórios tocados, pré-requisitos produzidos, desvios, dependências novas, divergências do contrato, falhas classificadas e pendências. Não aceite "pronto" sem evidência: rode você mesmo `make lint` e `make test` (na fase que cria os scripts da stack, eles passam a existir aqui) e veja a saída. Antes do commit, resolva o que o retorno levantou:
   - **Dependência `sem cobertura`**: `AskUserQuestion` com registrar com a `/adr-writer` (recomendado; a fase commita e o ADR vem antes do PR), trocar por algo que um ADR ou a spec cobre, ou parar. Cada opção diz o que a documentação oficial da dependência e da stack recomenda, com a página. Não deixe para o relatório: depois do commit, a dependência já virou decisão.
   - **Divergência do contrato**: `AskUserQuestion` com seguir (o item vai reprovar com dono `contrato`, e a `/spec-writer` revisa depois) ou pausar aqui para a `/spec-writer` revisar o contrato e retomar pelos rodapés. Dentro da `/implement-and-evaluate`, pergunte do mesmo jeito: decidir agora poupa uma avaliação inteira.
   - **`ambiente caiu`**: pare, diga à pessoa o comando e a mensagem, e espere o ok. Depois, rode o `preparar.py` e `make test` de novo antes de redespachar só os passos que faltam.
   - **Achado fora do contrato** que chega no meio da execução (revisão de segurança automática, regressão que você viu): `/fix-runner` modo achado, num subagente, com `Fix-Cycle: 0`. Nunca um subagente de correção avulso: ele não segue as regras de correção nem deixa o teste que impede a volta.
3. **Falha que o subagente não resolveu** em 3 tentativas: despache um subagente de correção com o erro e o contexto da fase, uma vez. Persistindo, a execução para nessa fase com status `parou na fase N` e vai direto ao relatório.
4. **Commit** (se autorizado), seguindo `references/fase.md` seção "Commit": só os arquivos da fase, com `git add <arquivos>` (nunca `-A` nem `.`), sem pular hooks, com os rodapés `Refs:` e `Plan-Phase:` que permitem retomar.
5. Guarde o resumo da fase para o briefing da próxima e para o relatório.

## Passo 3: verificação final

Siga `references/verificacao.md`: gates do contrato rodados por você, conferência dos componentes da spec, conferência dos pré-requisitos que a implementação produz (com uma correção, se der), prontidão de cada critério do manifesto e o status. **O status sai dessas checagens**, nunca da sensação de ter terminado: fases commitadas com gate vermelho não são sucesso.

## Passo 4: relatório e próximo passo

Escreva o relatório no chat com `references/relatorio.md`. O roadmap não muda aqui: `feito` é veredito, e veredito é da `/evaluator`. O próximo passo é sempre dito:

- `pronto para avaliar`: `/evaluator RF-NNN` (ou `fundação`), que grava `avaliacao.md` e, limpo, marca `feito`; com reprovação, `/fix-runner`. O laço inteiro, até o PR, é a `/implement-and-evaluate`;
- qualquer outro status: o que falta e qual skill resolve (`/spec-writer`, `/adr-writer`, `/hld-writer`) ou o que a pessoa precisa decidir.

## Regras que não se negociam

Cada uma existe porque a alternativa já deu errado em algum lugar:

- **Contrato manda no comportamento observável, spec manda na estrutura.** Se a spec diz 200 e o item diz 201, vale o item: é ele que a `/evaluator` vai exercitar. Caminho, nome de classe e decomposição seguem a spec. Na dúvida, pergunte: alguém de fora do sistema veria a diferença? Todo desempate entra em Desvios.
- **Entrada não se edita.** Spec, plano e contrato são da `/spec-writer`, e o contrato é regenerado inteiro; PRD, HLD e ADRs têm suas skills. Corrigir aqui some na próxima regeneração e esconde a divergência de quem decide.
- **Nada de stack fora dos ADRs.** Biblioteca ou ferramenta que nenhum ADR aceito nem a spec preveem é decisão de arquitetura: pare a fase e pergunte, em vez de instalar. Vale para dependência de desenvolvimento também; "sai fácil" não é cobertura.
- **Pronto é rodando.** Código escrito e não executado não está pronto. A fase só fecha com a validação do `Makefile` verde e, quando ela cria superfície (rota, migração, comando, tela), com a superfície exercitada de verdade uma vez.
- **Convenções do projeto, não inventadas.** Seed, fixture, configuração de teste e mocks seguem "Convenções para as features" da spec da fundação; estrutura de pastas e nomes, o `CLAUDE.md` e o HLD. Num RF, o código das features anteriores é o exemplo.
- **Stub só em teste.** Serviço externo ausente vira fake no padrão de mocks do projeto, nunca atalho no código de produção.
- **O `Makefile` é a porta.** Validação por `make lint`, `make test`, `make build` e `make check`, nunca chamando a ferramenta da stack por fora, que não é o que a CI roda.
- **Sem travessão** "—" nas mensagens de commit nem no relatório.

## Pedidos que mudam o padrão

Em linguagem natural, em qualquer ponto do pedido: "só as fases 1 e 2", "pula a fase 3", "pausa entre fases" (a orquestração espera um ok antes de despachar a próxima), "sem commits", "até 5 tentativas". Pedido que desliga a verificação final, o desempate pelo contrato ou a produção dos pré-requisitos não é atendido: sem eles a execução não diz nada confiável. Registre no relatório o que foi aplicado e o que foi recusado.
