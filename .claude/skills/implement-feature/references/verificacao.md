# Verificação final

Roda depois da última fase, ou quando a execução parou, antes do relatório. Existe porque a validação por fase não pega regressão entre fases, e porque "terminei" é a frase que mais aparece antes de algo não funcionar. Faça você, o orquestrador, na ordem abaixo; nenhum passo é opcional.

## 1. Gates do contrato

Rode cada comando de `## Gates de qualidade` do contrato, na ordem, a partir da raiz (`make check`, `make build`). O `make check` é o que a CI roda e já inclui lint e testes da stack.

- Falha nova, que nenhuma fase acusou, é **regressão**. Corrija com um subagente de correção, até 3 tentativas, e commite (se autorizado) com `fix(<escopo>): <o que corrigiu>` e os rodapés `Refs:` e `Plan-Phase: final`.
- Falha anterior registrada pelas fases continua anterior; não vira regressão.
- `make check-branch` falha na `main`: mais um motivo para o Passo 1 criar o branch.

## 2. Componentes da spec

Para cada linha da tabela `## Componentes` da spec: o caminho existe, o papel descrito aparece no conteúdo e o que ela promete em `## Contratos de interface` (rota, export, schema) bate com o código, dentro do desempate pelo contrato. O que falta vai para "Faltando da spec".

## 3. Pré-requisitos que a implementação produz

Confira cada entrada de Estado persistido, Entradas estáticas e Configuração do contrato contra os **artefatos** do repositório, sem subir o sistema (subir e consultar é trabalho da `/evaluator`):

| Subseção | Conferência |
|---|---|
| Estado persistido | Existe uma factory ou seed, no lugar da convenção, que cria o handle com os atributos declarados. Leia o código; não rode |
| Entradas estáticas | O arquivo existe no caminho exato e tem a propriedade declarada, conferida com a ferramenta que o contrato ou a máquina oferecem (tamanho, formato, `ffprobe` para mídia, chave que está ou não no JWKS) |
| Configuração | A chave está no arquivo de configuração de teste da convenção, com valor compatível com o sentido que o contrato dá |

Cada entrada fica `✓ produzido` ou `✗ faltando` com o motivo. Faltando e possível de produzir agora: um subagente de correção produz, você confere de novo e commita (se autorizado) com `test(<escopo>): produz pré-requisito <handle>`. Não deu (ferramenta ausente, decisão pendente): fica `✗` com o motivo.

Chave de configuração que já existe com valor incompatível com o contrato: não sobrescreva. Registre em Desvios e em "Pré-requisitos faltando", com o valor proposto, para a pessoa decidir.

Serviços em execução e Dependências externas não se conferem aqui: são condições de quem exercita o contrato.

## 4. Prontidão do manifesto

Para cada linha do `## Manifesto de cobertura`, com o texto literal e os IDs:

- `~ pronto`: gates verdes, pré-requisitos todos `✓` e nenhum componente faltando que os itens dessa linha usam;
- `✗ bloqueado`: qualquer um desses vermelho, com o motivo em uma linha.

Não rode teste por critério aqui, e nunca escreva `✓` num critério: `~` é sinal de que vale a pena chamar a `/evaluator`, não veredito. Exercitar cada item é o trabalho dela.

## 5. Status

| Status | Quando |
|---|---|
| `pronto para avaliar` | Gates verdes, nenhum componente faltando, todos os pré-requisitos `✓` e todos os critérios `~` |
| `incompleto` | Gates verdes, mas falta componente, pré-requisito ou superfície que não pôde ser exercitada |
| `com regressões` | Algum gate continua vermelho depois das correções |
| `parou na fase N` | Falha sem solução, decisão pendente ou bloqueio no meio do Passo 2 |

Nunca relate `pronto para avaliar` com qualquer linha vermelha acima, mesmo que todas as fases tenham commitado limpo.
