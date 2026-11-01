# Orquestração: RF-005 Recuperar senha

*Gerado pela skill implement-and-evaluate. Cada execução sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-11-01T14-03-15Z
- Branch: feat/rf-005-recuperar-senha
- Status: sucesso
- Orçamento: 3 ciclos de correção
- Autorizado: commits sim, fechamento sim
- Pedidos: nenhum

## Ciclos

| Ciclo | Skill | Status | Resultado | Commit |
| --- | --- | --- | --- | --- |
| 0 | implement-feature | pronto para avaliar | fases 4/4, mais 1 correção de achado (gitleaks) | 6 commits |
| 0 | evaluator | limpo | passou 45, falhou 0, bloqueado 0, manual 0; critérios 5/5 | |
| 1 | fix-runner (achado) | corrigido | revisão de segurança automática: job reset-password sai do Valkey ao concluir e ao falhar | 11e5c60 |
| 1 | evaluator | limpo | passou 45, falhou 0, bloqueado 0, manual 0; critérios 5/5 | |

## Mudanças entre ciclos

- Ciclo 1: nenhum item mudou de veredito (45 passaram nos dois ciclos); a correção fecha um achado fora do contrato, coberto por testes de unidade e de integração novos.

## Resultado

- Status final: sucesso
- Ciclos de correção: 1
- Commits: 1 de spec, 4 de fase, 2 de correção de achado (Fix-Cycle 0 e 1), 2 de registro
- Pendentes no fim: Nenhum.
- Manuais a revisar: Nenhum.

## Fechamento

- Merge de origin/main: já atualizado
- Reavaliação depois do merge: não precisou
- Push: feito (3e316f8); o segundo push, com a correção do ciclo 1, segue este commit de registro
- PR: https://github.com/maiconsouza89/ai-template-harness-nestj-react-monorepo/pull/18 aberto em rascunho
- CI: verde em 3e316f8 (check, pr-title); o commit da correção é acompanhado depois deste registro

## Avisos

- O `preparar.py` acusou o bloqueio "dependências não feitas no roadmap: nenhum", mas é um falso positivo: ele lê a palavra "nenhum" que o `contexto.py` imprime como se fosse uma dependência (`preparar.py`, função `contexto_rf`). A única dependência, RF-001, está `feito` no roadmap; a execução seguiu.
- Na verificação final da implement-feature, o `make check` parou em `check-secrets`: 4 falsos positivos `generic-api-key` do gitleaks (token falso em três specs e a lista de IDs de itens no `contract.md`). A fix-runner em modo achado corrigiu em 01578f3, com os fingerprints no `.gitleaksignore` e uma allowlist estreita para IDs de item em `contract.md` no `.gitleaks.toml`.
- Depois do primeiro push, a revisão de segurança automática apontou dois achados em `send-reset-password.ts`. O token em texto puro guardado no job da fila `email.send` (24 horas depois de concluído, 7 dias depois de falhar) foi corrigido no ciclo 1 (11e5c60). A diferença de tempo de resposta entre e-mail com e sem conta não foi corrigida: a spec (linha 269) decide não igualá-la, e mudar isso é da `/spec-writer`.
- Pendências para a `/spec-writer`: o contrato não tem item que observe a retenção do job na fila; o job `reset-password` agora é exceção à retenção de 7 dias de jobs falhos do ADR-0015 e das specs da fundação e do RF-001; o `verify-email` do RF-002 tem a mesma retenção do link com token e não foi alterado.
- O teste `verify-email.int-spec.ts > o quarto reenvio em 60 segundos do mesmo IP responde 429` do RF-002 falhou uma vez de forma intermitente (janela fixa de 60 segundos) e passou em todas as rodadas seguintes; não foi tocado.
- Os containers api e web do Compose só compilam `@app/contracts` na subida: depois de mudar Contratos, foi preciso `docker compose restart api web` para exercitar as telas.
