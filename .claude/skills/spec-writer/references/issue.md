# Issue de acompanhamento no GitHub

Opcional. Criar issue publica no repositório, então só acontece com a flag `criar-issue` no pedido ou com um sim explícito à pergunta. Os três arquivos já estão salvos quando isto roda; falha aqui não desfaz nada.

## 1. Decidir

| Situação | O que fazer |
| --- | --- |
| Flag `criar-issue` no pedido | Criar, sem perguntar |
| Sem flag, um RF | Perguntar com `AskUserQuestion`: "Criar a issue [RF-NNN] Nome no GitHub?", com não como recomendado quando o time não usa issues por RF |
| Sem flag, lote | O orquestrador já perguntou uma vez no plano consolidado; a resposta vale para todos |
| Modo Direto sem ninguém para responder e sem flag | Não criar |

## 2. Procurar uma aberta

```
gh issue list --search "[RF-NNN] in:title" --state open --json number,title,url --limit 5
```

Filtre pelo título que **começa** com `[RF-NNN]`: a busca do GitHub é por palavra e traz parecidas.

- Uma aberta: não crie; reporte o link.
- Mais de uma: use a primeira e avise no relatório que há duplicadas.
- Só fechadas ou nenhuma: crie. Fechada significa que um ciclo anterior do RF já foi entregue.

Fundação: título `[fundação] Base do projeto`, busca por `[fundação] in:title`.

## 3. Título e corpo

Título: `[RF-NNN] <nome do RF no PRD>`.

Tudo sai do que `contexto.py rf` já imprimiu; não releia o PRD.

````markdown
## Resumo

Implementa o **RF-NNN <nome>**.

<descrição do RF em uma frase, do PRD, e "Para quem" em outra>

## Critérios de aceitação

- [ ] <texto literal de cada critério do manifesto do contrato, inclusive os de integração>

## Depende de

- <RF-NNN nome (motivo, status no roadmap)>, ou "nenhum"

## Onda e prioridade

- Onda: <N>
- Prioridade: <alta|media|baixa>

## Documentos

- Spec: `docs/features/<pasta>/spec.md`
- Plano: `docs/features/<pasta>/plan.md`
- Contrato: `docs/features/<pasta>/contract.md`
- PRD: `docs/product/prd.md`, RF-NNN

---

Gerada pela skill spec-writer. Cada critério acima é verificado pelo contrato.
````

Sem travessão no texto, como no resto da documentação.

## 4. Criar

```
gh issue create --title "<título>" --body-file <arquivo temporário com o corpo>
```

Use `--body-file` com um arquivo no diretório temporário da sessão: corpo com crases e cifrões quebra fácil dentro de aspas. Sem labels, responsáveis, milestone ou projeto; quem quiser configura padrões no repositório.

## 5. Falha

`gh` ausente, sem autenticação, sem rede ou repositório sem remoto: não aborte. Reporte no fim, em "Pendências", a mensagem do `gh` e o comando para rodar à mão.
