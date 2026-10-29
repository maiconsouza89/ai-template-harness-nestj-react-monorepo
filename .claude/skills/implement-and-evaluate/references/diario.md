# orquestracao.md

Diário de `docs/features/<pasta>/orquestracao.md`. Um por feature, sobrescrito no começo de cada execução e atualizado ao fim de cada ciclo, para que uma execução interrompida deixe rastro legível. É versionado: entra no PR junto do `avaliacao.md`, e o histórico das execuções anteriores fica no git. O `make check-eval` confere título, status e a seção de ciclos.

Sem travessão "—" e sem comentário HTML. Seção sem conteúdo fica com `Nenhum.`

## Modelo

````markdown
# Orquestração: <RF-NNN Nome | fundação>

*Gerado pela skill implement-and-evaluate. Cada execução sobrescreve este arquivo; o histórico está no git.*

- Execução: <2026-10-27T17-32-04Z>
- Branch: <branch>
- Status: <em execução | sucesso | manual pendente | precisa de decisão | travado | esgotado | abortado | pr bloqueado>
- Orçamento: <N> ciclos de correção | sem limite
- Autorizado: commits <sim | não>, fechamento <sim | não>
- Pedidos: <"pausa entre ciclos", ... | nenhum>

## Ciclos

| Ciclo | Skill | Status | Resultado | Commit |
| --- | --- | --- | --- | --- |
| 0 | implement-feature | pronto para avaliar | fases 5/5 | 5 commits |
| 0 | evaluator | reprovado | passou 40, falhou 3, bloqueado 2, manual 1 | |
| 1 | fix-runner | corrigido | API-AUTH-03, WRK-FALHA-01 | a1b2c3d |
| 1 | evaluator | limpo | passou 48, manual 0 | |

## Mudanças entre ciclos

- Ciclo 1: passaram API-AUTH-03, WRK-FALHA-01; continuam falhando: nenhum

## Resultado

- Status final: <status>
- Ciclos de correção: <N>
- Commits: <fases> de fase, <N> de correção, <1> de registro
- Pendentes no fim: <IDs falhou e bloqueado, com o dono: "CLI-BANCO-03 (contrato)" | Nenhum.>
- Manuais a revisar: <IDs | Nenhum.>

## Fechamento

- Merge de origin/main: <já atualizado | limpo | conflitos resolvidos em <arquivos> | sem solução: <motivo>>
- Reavaliação depois do merge: <limpo | não precisou | <status>>
- Push: <feito | falhou: <motivo>>
- PR: <url aberto | url existente atualizado | não aberto: <motivo>>
- CI: <verde, PR marcado como pronto | verde, merge bloqueado: <o que falta> | vermelha em <job>: <o que se fez> | sem checks | não acompanhada: <motivo>>

## Avisos

- <trava antiga sobrescrita, retorno fora do formato, falha de gh>
````
