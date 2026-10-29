# Ambiente da avaliação

## Sumário

1. Descoberta
2. Marcador e limpeza de sobras
3. Subir e conferir pré-requisitos
4. Derrubar

## 1. Descoberta

A skill prescreve a estrutura da avaliação e deixa a tática para a descoberta: qual comando migra, qual ferramenta dirige o navegador. Procure nesta ordem; a camada de cima vence, e o relatório registra qual camada respondeu cada decisão.

| Camada | Onde | O que costuma responder |
|---|---|---|
| 1 | `## Pré-requisitos` do contrato | O que precisa existir: serviços, handles, arquivos, configuração, dependências externas |
| 2 | `CLAUDE.md`, `CONTRIBUTING.md`, `README.md` | Como o projeto quer o ambiente: `make test`, `make build`, Docker Compose |
| 3 | `docs/features/fundacao/spec.md`, seção "Convenções para as features", e a spec do alvo | Seed e factories, lugar das fixtures, configuração de teste, padrão de mocks; a ferramenta de cada superfície, na tabela "Verificação por superfície" da Estratégia de testes |
| 4 | Contratos de outras pastas em `docs/features/` | Handles e caminhos já usados, que se reaproveitam |
| 5 | A stack: `Makefile`, `scripts/*.sh`, `compose.yaml`, manifestos de pacote, configuração do ORM, `.env.test` | Comandos concretos de instalar, migrar, popular, subir |
| 6 | Defaults da stack detectada | O que sobrou, pelo conhecimento geral da stack |
| 7 | Abortar com diagnóstico | Diga o que procurou e onde, e sugira documentar em "Convenções para as features" da fundação ou no `CONTRIBUTING.md` |

O que precisa estar respondido antes de subir:

- instalar as dependências do projeto;
- criar e apagar um banco efêmero, e migrá-lo;
- criar o estado persistido de cada handle do contrato pela convenção do projeto (factory ou seed);
- subir, conferir a saúde e parar cada serviço de "Serviços em execução";
- limpar o estado entre itens;
- conferir as entradas estáticas (onde estão e com que ferramenta checar a propriedade);
- dirigir cada superfície do contrato: cliente HTTP, navegador, chamada direta, comando, fila.

## 2. Marcador e limpeza de sobras

**Marcador.** `<alvo>` é `rf002` para `RF-002` ou `fundacao` para a fundação; `<execução>` é a data e hora UTC no formato `2026-10-27T17-32-04Z`. Use exatamente estas formas em todo lugar, para que a limpeza case com a criação:

- banco: `eval_<alvo>_<execução>` (minúsculas, hífens trocados por `_`);
- pasta temporária: `<tmp do sistema>/evaluator-<alvo>-<execução>/`, com o arquivo `processos.lock` listando os PIDs que a skill subiu.

**Avaliação concorrente.** Antes de limpar, leia os `processos.lock` de `evaluator-<alvo>-*`. Se algum PID listado está vivo (`kill -0`), aborte: "avaliação concorrente de <alvo>: PID <N> vivo em <arquivo>. Espere terminar ou pare, e rode de novo." Não toque nos recursos dela.

**Limpeza**, só com o marcador:

- apague bancos `eval_<alvo>_*`;
- apague pastas `evaluator-<alvo>-*`;
- mate os PIDs dos `processos.lock` que ainda estão vivos. PID que parece reciclado por outro processo fica: matar um estranho é pior que deixar uma sobra.

Registre o que removeu. Erro na limpeza é aviso, não bloqueio.

## 3. Subir e conferir pré-requisitos

1. Instale as dependências. Falhou: `abortado no passo 2`, com o erro.
2. Crie o banco efêmero no servidor que o projeto usa em teste (o do Compose, por exemplo) e a pasta temporária com o `processos.lock`.
3. Migre o banco efêmero.
4. Crie o estado persistido declarado.
5. Suba cada serviço de "Serviços em execução" apontando para o banco efêmero, confira a saúde e anote o PID no `processos.lock`.
6. **Pré-voo**: confira ao vivo cada entrada das subseções presentes no contrato.

| Subseção | Conferência ao vivo |
|---|---|
| Serviços em execução | Saúde ou sinal de pronto responde |
| Estado persistido | O handle existe com os atributos declarados (consulta ao banco ou à fila) |
| Entradas estáticas | O arquivo existe no caminho e tem a propriedade declarada, conferida com a ferramenta que o contrato cita ou a máquina oferece |
| Configuração | A chave está em vigor nos serviços, com valor compatível com o sentido que o contrato dá |
| Dependências externas | O simulador ou a ferramenta estão disponíveis, na versão quando o contrato diz |

Cada entrada fica `✓` ou `✗` com o motivo. `✗` não aborta: deixa `bloqueado` os itens que a consomem, e os gates rodam do mesmo jeito.

Entrada declarada que nenhum item usa é erro de autoria do contrato. Confira normalmente; se der `✗`, registre em Avisos como "declarado e não usado por nenhum item", sem bloquear nada. O `validate.py` costuma pegar isso antes.

Qualquer falha dos passos 1 a 5 (migração que explode, serviço que não fica saudável depois de uma espera razoável) aborta antes dos gates, com o que foi feito até ali.

## 4. Derrubar

Depois do último item, ou em qualquer aborto depois de subir, nesta ordem:

1. mate os PIDs do `processos.lock`;
2. apague o banco efêmero;
3. apague a pasta temporária.

Cada passo é de melhor esforço: falha vira aviso no relatório, e a limpeza do Passo 2 da próxima avaliação recolhe a sobra.

Com "mantém o ambiente": pule tudo e imprima a URL do banco, as URLs dos serviços, a pasta temporária e o comando para limpar depois.
