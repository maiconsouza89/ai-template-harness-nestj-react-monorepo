# Modelos de despacho

Cada `/evaluator` e cada `/fix-runner` roda num subagente `general-purpose` novo. O subagente invoca a skill pela ferramenta Skill e devolve só um bloco JSON, para que a orquestração decida sem reler relatório em markdown. Copie o modelo, preencha os colchetes e mande inteiro.

## Evaluator

```
Invoque a skill `evaluator` com esta entrada:

[docs/features/<pasta>]

Não faça commit nem push. Quando a skill terminar, responda APENAS com um bloco JSON:

{
  "status": "limpo | reprovado | reprovado-no-gate | pendente | abortado-no-passo | abortado-no-item",
  "detalhe_status": "<o status como está no avaliacao.md, por extenso>",
  "relatorio": "docs/features/<pasta>/avaliacao.md",
  "itens": {
    "passou": ["<ID>"], "falhou": ["<ID>"], "bloqueado": ["<ID>"],
    "manual": ["<ID>"], "pulado": ["<ID>"]
  },
  "donos": {"<ID falhou ou bloqueado>": "código | contrato | decisão | ambiente"},
  "criterios": {"verificado": 0, "reprovado": 0, "indeterminado": 0, "total": 0},
  "roadmap": "<o que a skill mudou no roadmap, ou null>",
  "motivo_aborto": "<texto ou null>"
}

Monte as listas de itens a partir da seção "## Itens" do avaliacao.md, pelo Veredito de cada um,
e os donos pela linha "- Dono:" de cada item falhou ou bloqueado.
```

## Fix Runner, modo avaliação

```
Invoque a skill `fix-runner` com esta entrada:

[docs/features/<pasta>], modo avaliação, itens: [IDs de falhou e bloqueado, separados por vírgula, ou "nenhum: avaliação abortada, ver Motivo do aborto"], ciclo [N].

O commit está autorizado pela pessoa para esta execução: não pergunte de novo. Não faça push.
Quando a skill terminar, responda APENAS com um bloco JSON:

{
  "status": "corrigido | validacao-falhou | abortado",
  "commit": "<sha ou null>",
  "arquivos": ["<caminho>"],
  "itens_visados": ["<ID>"],
  "pendencias": ["<linha>"],
  "motivo_aborto": "<texto ou null>"
}
```

## Fix Runner, modo conflito

```
Invoque a skill `fix-runner` com esta entrada:

[docs/features/<pasta>], modo conflito, merge de origin/main já em andamento no working tree, ciclo [N].

O commit de merge está autorizado pela pessoa para esta execução: não pergunte de novo. Não faça push.
Quando a skill terminar, responda APENAS com um bloco JSON:

{
  "status": "corrigido | validacao-falhou | abortado",
  "commit": "<sha ou null>",
  "arquivos": ["<caminho>"],
  "motivo_aborto": "<texto ou null>"
}
```

## Fix Runner, modo achado

```
Invoque a skill `fix-runner` com esta entrada:

[docs/features/<pasta>], modo achado, ciclo [N].
Origem: [revisão de segurança automática | CI do PR #<N>, job <nome> | regressão vista na orquestração]
Achado: [a descrição, em poucas linhas]
Arquivos: [os que o achado cita]
Regra da spec: [seção e linha que o achado viola, ou "nenhuma identificada"]
[Só CI: as linhas do erro do `gh run view <id> --log-failed`, cortadas em até 80 linhas]

O commit está autorizado pela pessoa para esta execução: não pergunte de novo. Não faça push.
Quando a skill terminar, responda APENAS com um bloco JSON:

{
  "status": "corrigido | validacao-falhou | abortado",
  "commit": "<sha ou null>",
  "arquivos": ["<caminho>"],
  "pendencias": ["<linha>"],
  "motivo_aborto": "<texto ou null>"
}
```

## Quando o retorno não é JSON

Peça uma vez ao mesmo subagente (SendMessage) só o bloco JSON. Persistindo, leia você o `avaliacao.md` ou o `git log -1` para preencher, e registre em Avisos que o retorno veio fora do formato.
