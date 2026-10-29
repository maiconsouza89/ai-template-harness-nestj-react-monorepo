# Modo Lote

Gera specs de vários RFs da mesma onda em paralelo, um subagente por RF, sem entrevista: cada subagente aplica os defaults de `references/entrevista.md` seção 4 e marca `(hipótese)`. O orquestrador (você, na conversa principal) só resolve a entrada, confere, despacha e reporta; quem escreve as specs são os subagentes.

## Ativação

| Entrada | Modo |
| --- | --- |
| Um RF (`RF-003`, `3`, "Enviar criativo") | Entrevista ou Direto |
| Vários RFs (`RF-002 RF-003`) | Lote |
| Onda (`onda 2`) | Lote |
| Onda mais RFs (`onda 2 RF-003`) | Lote, se todos forem da mesma onda |

## Regra da mesma onda

Todos os RFs de um lote são da mesma onda, calculada dos `Depende de` do PRD (é a mesma do roadmap). RFs de ondas diferentes no mesmo lote são recusados: "RFs de ondas diferentes não entram no mesmo lote. As specs da onda seguinte ficam melhores depois que a anterior foi implementada, porque o código passa a ter os padrões que elas vão seguir. Rode a onda N primeiro." Não divida o pedido em dois lotes por conta própria. Onda que não existe ou RF que não existe: recuse listando as ondas ou os RFs disponíveis (`contexto.py estado`).

Por definição de onda, nenhum RF do lote depende de outro do mesmo lote: todas as dependências estão em ondas anteriores.

## Fluxo do orquestrador

1. **Resolver.** Expanda ondas, junte e deduplique os RFs. Nome ambíguo (casa com mais de um RF): pergunte qual, antes de qualquer outra coisa.
2. **Conferir.** `python3 <skill-dir>/scripts/contexto.py onda N` dá, por RF, o status no roadmap, as dependências não feitas e o estado da spec. Some a isso o estado da fundação (`contexto.py estado`).
3. **Plano consolidado.** Mostre e espere confirmação explícita:

```
Lote para "onda 2":
- RF-002 Cadastrar tela: nova
- RF-003 Enviar criativo: já tem spec completa (pular ou regenerar?)

Dependências não feitas: RF-001 (pendente). As specs saem, mas o código ainda não tem os padrões dela.
Fundação: spec existe, não implementada
Modo: paralelo, 1 subagente por RF
Aceite automático: os defaults da skill, marcados (hipótese)
Destino: docs/features/RF-002-cadastrar-tela/, docs/features/RF-003-enviar-criativo/
Roadmap: os RFs gerados passam a "em andamento"
```

Pergunte com `AskUserQuestion`: seguir (recomendado quando nada está em conflito), seguir regenerando os que já têm spec, ou cancelar. Na mesma chamada, se a flag `criar-issue` não veio no pedido, pergunte uma vez se cria issue para cada RF do lote; a resposta vale para todos. Cancelou: nada é despachado e nada é escrito.

Marcas por RF no plano: `nova`, `já tem spec completa (pular ou regenerar?)`, `spec incompleta, será regenerada inteira` (os três arquivos têm o mesmo ciclo de vida), `dependência não feita`, `bloqueado no roadmap: <motivo>`.

4. **Fundação primeiro.** Se a fundação não tem spec e não está implementada, ela entra no plano como primeiro passo, sozinha, e os RFs só são despachados depois que ela termina: os contratos dos RFs reusam as convenções que ela define, e gerá-los em paralelo produziria convenções diferentes em cada um.
5. **Despachar.** Todos os subagentes de RF numa única mensagem, com várias chamadas ao `Agent`. Cada prompt leva:
   - o RF, o caminho da skill e a instrução de seguir o `SKILL.md` no modo Direto para esse RF;
   - que a política de defaults de `references/entrevista.md` seção 4 substitui toda pergunta, e que cada default aplicado vira linha `(hipótese)` na spec;
   - que o portão de cobertura vale: lacuna, nenhum dos três arquivos é salvo e o subagente reporta a falha;
   - que **não** mexe no roadmap nem cria issue: o orquestrador faz isso uma vez no fim, para evitar escrita concorrente no `docs/product/roadmap.md`.

   Cada subagente faz a própria descoberta no código; não compartilhe uma descoberta entre eles.
6. **Coletar.** Falha de um subagente não cancela os outros. Para cada RF gerado com sucesso, rode o `validate.py` na pasta, depois `roadmap.py set` (ver `SKILL.md`, Finalizar) e, se pedido, a issue. Reporte:

```
Lote: 2 de 3 RFs gerados
ok RF-002 → docs/features/RF-002-cadastrar-tela/ (12 itens, 3/3 critérios, 4 hipóteses)
ok RF-003 → docs/features/RF-003-enviar-criativo/ (9 itens, 4/4 critérios, 2 hipóteses)
falhou RF-004: lacuna de cobertura em "Criativo reprovado volta ao anunciante com o motivo."
```

Depois, as hipóteses de todos os RFs juntas, as que mais mudam o desenho primeiro, para o usuário revisar de uma vez.
