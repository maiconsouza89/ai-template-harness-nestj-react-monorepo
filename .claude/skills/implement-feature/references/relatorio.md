# Relatório

Vai no chat, ao fim da execução. Nenhum arquivo é escrito: o histórico fica nos commits, e o relatório persistido é o da `/evaluator`. Seções sem conteúdo somem, sem "nenhum" de enfeite, exceto Status, Fases e Próximo passo, que sempre aparecem.

```
<RF-NNN Nome | Fundação>

Status: pronto para avaliar | incompleto | com regressões | parou na fase N
Branch: <branch>  Fases: <commitadas>/<total> (<k> retomadas)  Commits: sim | não autorizados

Fases
- Fase 1: <título>: <sha> | no working tree | parou: <motivo>

Gates
- check: `make check`: verde | vermelho: <alvo que falhou e trecho do erro>

Critérios (prontidão preliminar; o veredito é da /evaluator)
~ <texto literal do critério> [IDs]
✗ <texto literal do critério> [IDs]: <motivo em uma linha>

Pré-requisitos
- ✓ `<handle ou caminho>`: <onde ficou | conferência que passou>
- ✗ `<handle ou caminho>`: <motivo>

Faltando da spec
- <arquivo, export ou contrato de interface>

Desvios
- spec dizia X, item <ID> exige Y, segui Y
- <adaptação e porquê>

Decisões tomadas durante a execução
- dependência <nome@versão> sem cobertura: <o que a pessoa escolheu>
- divergência <ID>: <seguir | pausar para /spec-writer>
- achado <origem>: corrigido em <sha> pela /fix-runner modo achado

Falhas do ambiente
- <comando>: <mensagem>; <o que deixou de ser exercitado>

Falhas anteriores
- <teste>: já falhava antes desta execução

Pendências para outras skills
- /hld-writer: <divergência com o HLD>
- /adr-writer: <tecnologia sem ADR>
- /spec-writer: <spec ou contrato a revisar>

Pedidos aplicados / recusados
- <pedido>: aplicado | recusado: <motivo>

Próximo passo: /evaluator <RF-NNN | fundação>, depois PR | <o que falta e quem resolve>
```

O cabeçalho da seção de critérios leva sempre "(prontidão preliminar; o veredito é da /evaluator)". Sem ele, `~` é lido como aprovado.
