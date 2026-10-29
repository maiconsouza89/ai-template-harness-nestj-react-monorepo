---
name: evaluator
description: Dá o veredito de um RF-NNN (ou da fundação) contra o `contract.md` em `docs/features/RF-NNN-nome/`, exercitando cada item do contrato de verdade (HTTP, navegador, banco, arquivos, fila, comando) num ambiente efêmero, depois de conferir os pré-requisitos e rodar os gates de qualidade. Grava o resultado em `docs/features/RF-NNN-nome/avaliacao.md` (versionado, um por feature, sobrescrito a cada avaliação), com o veredito por item e por critério de aceitação do manifesto, e marca o RF como feito no roadmap quando a avaliação sai limpa. Não edita código. Use sempre que o usuário quiser avaliar, verificar, validar ou conferir se um RF ou a fundação cumpre o contrato ("avalia o RF-003", "o contrato da fundação passa?", "roda o evaluator", "confere se está pronto"), mesmo sem dizer evaluator; depois de uma `/implement-feature` ou `/fix-runner`; ou antes de marcar um RF como feito.
---

# Evaluator

A skill responde uma pergunta só: **a implementação cumpre o contrato?** Ela não lê spec, plano nem PRD para decidir: o `contract.md` é a única fonte do que verificar, porque é a promessa que nasceu dos critérios de aceitação, e o resto descreve como construir. Cada item é exercitado de fora, contra o sistema rodando, e cada observação fica registrada com o esperado e o observado.

É somente leitura no projeto. Escreve só o `avaliacao.md` da feature e, com veredito limpo, o status no roadmap. Não cria seed, fixture nem teste que falte: falta vira item bloqueado, e quem corrige é a `/fix-runner` ou a `/implement-feature`. Não faz commit: o `avaliacao.md` fica no working tree para entrar no PR.

## Entrada

O alvo (`RF-003`, `3`, `fundação`, a pasta ou um arquivo dela) e, opcionalmente, em linguagem natural:

| Pedido | Efeito |
|---|---|
| "só API", "só API e E2E", "pula UI" | Filtra superfícies; o resto fica `pulado` |
| "só API-AUTH-03", "só os itens X e Y" | Filtra itens |
| "só os que falharam" | Os itens `falhou` ou `bloqueado` do `avaliacao.md` atual |
| "mantém o ambiente" | Não derruba nada no fim; imprime como inspecionar e como limpar |
| "para na primeira falha" | Para no primeiro `falhou` |

Filtro, ambiente mantido e parada antecipada nunca dão veredito `limpo`: o resultado vira `pendente` se nada falhou, porque nem todos os itens rodaram.

## Passo 0: resolver e conferir o contrato

Resolva a pasta como a `/implement-feature` faz (`docs/features/RF-NNN-*/` ou `docs/features/fundacao/`) e rode:

```
python3 .claude/skills/spec-writer/scripts/validate.py docs/features/<pasta>
```

Erro do validador aborta: contrato fora de forma não tem veredito confiável. Sem `contract.md`, aborte apontando a `/spec-writer`. "Só os que falharam" sem `avaliacao.md` anterior também aborta.

## Passo 1: descobrir como subir e exercitar

Siga `references/ambiente.md` seção 1. Ela diz em que ordem procurar (contrato, documentos do projeto, convenções da fundação, contratos irmãos, a stack, defaults) e o que é preciso saber antes de subir: instalar dependências, criar e apagar um banco efêmero, migrar, popular, subir e conferir cada serviço, limpar estado entre itens e dirigir cada superfície. Registre de onde veio cada resposta: a tabela de descoberta do relatório é o que deixa outra pessoa repetir a avaliação.

## Passo 2: subir o ambiente e conferir os pré-requisitos

Siga `references/ambiente.md` seções 2 e 3: limpar sobras de avaliações anteriores (só o que tem o marcador da skill), subir o ambiente efêmero e conferir **ao vivo** cada entrada das cinco subseções de Pré-requisitos. Entrada que falha não aborta: deixa `bloqueado` cada item que a consome. Falha ao subir (instalação, migração, serviço que não fica saudável) aborta com o que aconteceu até ali.

## Passo 3: gates de qualidade

Com o ambiente no ar, rode cada comando de `## Gates de qualidade` do contrato, na ordem, a partir da raiz, com as variáveis do ambiente efêmero injetadas (banco e URLs dos serviços). No primeiro gate vermelho, pare: todos os itens ficam `bloqueado: gates reprovados em <nome>`, todos os critérios `⊘` e o status é `reprovado no gate <nome>`. Um contrato que declara gates declara a régua mínima de entrega; não há pedido que pule essa fase. Sem a seção de gates, o passo some.

## Passo 4: exercitar os itens

Um por vez, na ordem Serviço, API HTTP, CLI, Worker, Evento, UI, E2E (da base para o topo: falha embaixo explica falha em cima) e, dentro da superfície, na ordem do contrato. Para cada item:

1. **Filtrado**: `pulado`, com o filtro.
2. **Subjetivo** (`**Notas:** subjetivo; só revisão manual.`): `manual`, sem exercitar. Vem antes dos pré-requisitos porque item subjetivo nunca se verifica sozinho.
3. **Pré-requisito vermelho** que o item consome (handle no `Dado`, caminho no `Quando`, condição do `Dado comum`): `bloqueado`, nomeando o pré-requisito.
4. **Limpar o estado** com o mecanismo descoberto e garantir que o estado persistido declarado continua lá.
5. **Traduzir o `Então`** com `references/assercoes.md`. O que casa com um padrão vira asserção mecânica. O que não casa é interpretado, executado e marcado com `*`, com a interpretação escrita no relatório. O que não tem interpretação plausível deixa o item `manual`, citando o trecho.
6. **Exercitar** a superfície com o que o projeto oferece. Em UI e E2E, além dos bullets, rode a base visual de `references/assercoes.md` seção 5: tela que carrega com imagem quebrada ou menu cortado falha o item mesmo que cada bullet passe.
7. **Veredito**: `passou` só com todos os bullets verdes, `falhou` com qualquer um vermelho. Cada bullet registra esperado e observado. Para cada bullet vermelho, uma linha de causa ancorada na evidência; sem evidência suficiente, escreva "causa: não determinada; veja a evidência" em vez de supor.
8. **Dono**, em todo item `falhou` ou `bloqueado`: quem resolve, pela causa. É o que deixa a `/implement-and-evaluate` encerrar sem despachar uma correção que não tem o que corrigir.

   | Dono | Quando | Quem resolve |
   |---|---|---|
   | `código` | Código, teste, seed, fixture ou configuração do repositório; pré-requisito que a implementação devia produzir | `/fix-runner` |
   | `contrato` | O item contradiz a ferramenta, a spec ou a si mesmo; nenhum código o faria passar como está escrito | `/spec-writer` (Revisão) |
   | `decisão` | Falta ADR ou ferramenta no projeto (navegador, cliente de fila) para exercitar o item | `/adr-writer` |
   | `ambiente` | A máquina: serviço que caiu, Docker parado, credencial externa ausente | a pessoa |

   Na dúvida entre `código` e outro, escolha `código`: uma correção a mais custa menos que um item certo que ninguém tenta corrigir.

**Erro de transporte** (conexão recusada, timeout, processo que caiu; resposta 4xx ou 5xx **não** é erro de transporte) tem uma nova tentativa. Três itens seguidos com o mesmo erro de transporte indicam serviço morto: reinicie o serviço uma vez; se não voltar, aborte e marque os itens restantes `bloqueado: avaliação parou no item <ID>: <serviço> caiu`.

## Passo 5: derrubar

Siga `references/ambiente.md` seção 4. É idempotente e, em falha, só registra aviso: a próxima avaliação limpa as sobras. Com "mantém o ambiente", não derrube e imprima banco, URLs e o comando de limpeza.

## Passo 6: veredito, relatório e roadmap

Por critério do manifesto: `✓ verificado` se todos os itens dele passaram; `✗ reprovado` se algum falhou; `⊘ indeterminado` se nenhum falhou mas algum ficou `bloqueado`, `manual` ou `pulado`.

| Status | Quando |
|---|---|
| `limpo` | Todos os critérios `✓`, sem filtro, sem abortar |
| `reprovado` | Algum critério `✗` |
| `reprovado no gate <nome>` | O Passo 3 parou |
| `pendente` | Nenhum `✗`, mas algum `⊘` |
| `abortado no passo <N>` | Falha de infraestrutura nos passos 0 a 2 |
| `abortado no item <ID>: <motivo>` | Serviço morto ou parada na primeira falha |

Escreva `docs/features/<pasta>/avaliacao.md` com `references/relatorio.md`, sobrescrevendo o anterior: o histórico fica no git, e um arquivo por feature é o que o `make check-eval` confere. No chat, só a projeção curta que o mesmo arquivo descreve.

Se 80% ou mais dos itens **exercitados** falharam pelo mesmo padrão (404 em toda rota, arquivo inexistente em todo item), acrescente no topo: "A maioria dos itens falha com <padrão>; a implementação pode não estar no lugar." Isso informa, não muda veredito.

**Roadmap** (só RF; a fundação não entra nele):

- `limpo`: `python3 .claude/skills/prd-writer/scripts/roadmap.py set RF-NNN feito --motivo "avaliação limpa em docs/features/<pasta>/avaliacao.md"`. A mudança fica no working tree do branch e vale de fato quando o PR entra na `main`.
- `reprovado`, `reprovado no gate` ou `abortado`: `roadmap.py set RF-NNN "em andamento" --motivo "avaliação <status>: <resumo curto>"`.
- `pendente`: não mexa no status. O que falta é revisão manual ou destravar um pré-requisito.

Termine dizendo o próximo passo: `limpo`, abrir o PR com o `avaliacao.md` e o roadmap; `reprovado`, `/fix-runner <alvo>` para os itens com dono `código` e a skill do dono para os outros; `pendente`, quais itens `manual` a pessoa revisa e quais bloqueios resolver.

## Regras que não se negociam

Cada uma existe porque a alternativa já deu errado em algum lugar:

- **O contrato é a única fonte do que verificar.** Spec e plano descrevem como construir; usá-los para decidir faz a avaliação confirmar a implementação em vez de conferir a promessa.
- **Exercitar o item, não rodar a suíte.** A suíte de testes do projeto foi escrita por quem implementou; ela entra só como gate. O veredito vem de exercitar cada item de fora.
- **Somente leitura.** Código, testes, seeds, fixtures, configuração, spec, plano e contrato não se tocam. Avaliador que conserta o que avalia não sabe mais o que avaliou.
- **Evidência em todo veredito.** Sem esperado e observado, `passou` é opinião. Interpretação vira `*`, nunca asserção mecânica disfarçada.
- **`✓` só com todos os itens passando.** Bloqueado, manual ou pulado deixam o critério `⊘`: não verificado não é aprovado.
- **Limpeza só do que é seu.** Banco, pasta e processo sem o marcador da skill não se apagam, nunca. O marcador está em `references/ambiente.md`.
- **Sem commit, sem push.** O `avaliacao.md` e o roadmap ficam no working tree; quem commita é a pessoa ou a `/implement-and-evaluate`, com autorização.
- **Sem travessão** "—" no `avaliacao.md`.
