# Avaliação: RF-001 Criar conta de exibidor ou anunciante

*Gerado pela skill evaluator. Cada avaliação sobrescreve este arquivo; o histórico está no git.*

- Execução: 2026-10-28T10-00-00Z
- Branch: feat/rf-001-criar-conta
- Commit: abc1234
- Status: reprovado
- Itens: 2 passou, 1 falhou, 0 bloqueado, 0 manual, 0 pulado, de 3
- Critérios: 2 verificado, 1 reprovado, 0 indeterminado, de 3
- Filtros: nenhum

## Critérios

| Critério de aceitação | Resultado | Itens |
| --- | --- | --- |
| Exibidor conclui o cadastro e o estabelecimento aparece na posição confirmada. | ✓ verificado | API-CADASTRO-01 |
| Uma mesma conta consegue atuar como exibidor e anunciante sem novo cadastro. | ✓ verificado | API-CADASTRO-02 |
| Documento repetido não gera segunda conta. | ✗ reprovado | API-CADASTRO-03 (falhou: resposta 201) |

## Gates de qualidade

- ✓ check: `make check`, código 0

## Pré-requisitos

### Serviços em execução
- ✓ API: http://localhost:3000, saúde /health respondeu 200

## Itens

### API HTTP

#### API-CADASTRO-01
- Veredito: passou
- ✓ a resposta é 201 | esperado 201, observado 201

#### API-CADASTRO-02
- Veredito: passou
- ✓ a resposta é 200 | esperado 200, observado 200

#### API-CADASTRO-03
- Veredito: falhou
- Dono: código
- ✗ a resposta é 409 | esperado 409, observado 201
  - causa: a rota não confere o documento antes de gravar

## Descoberta

| Decisão | Camada | Fonte |
| --- | --- | --- |
| Cliente HTTP | 6 | default da stack |

## Limpeza e ambiente

- Sobras removidas: Nenhuma.
- Derrubada: completa

## Avisos

Nenhum.
