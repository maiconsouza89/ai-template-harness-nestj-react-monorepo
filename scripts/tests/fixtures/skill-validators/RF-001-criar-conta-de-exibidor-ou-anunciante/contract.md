# Contrato: RF-001 Criar conta de exibidor ou anunciante

*Gerado pela skill spec-writer. Edições à mão são sobrescritas na regeneração.*

## Pré-requisitos

### Serviços em execução
- API e Banco no ar.

### Estado persistido
- `conta-exibidor`: conta com papel exibidor e documento 12345678909. Usado por: API-CADASTRO-02, API-CADASTRO-03

### Dependências externas
- DEP-2 simulado no padrão de mocks do projeto.

## Gates de qualidade

Cada gate precisa passar para a feature ser considerada pronta.

- **check**: `make check`. Todas as verificações do repositório passam.

## Manifesto de cobertura

| Critério de aceitação | Coberto por |
| --- | --- |
| Exibidor conclui o cadastro e o estabelecimento aparece na posição confirmada. | API-CADASTRO-01 |
| Uma mesma conta consegue atuar como exibidor e anunciante sem novo cadastro. | API-CADASTRO-02 |
| Documento repetido não gera segunda conta. | API-CADASTRO-03 |

## API HTTP

Modo de verificação: requisições HTTP contra a API em execução, inspecionando status, corpo e estado persistido.

### Cadastro

#### API-CADASTRO-01
- **Dado:** nenhuma conta com o documento 98765432100.
- **Quando:** a pessoa cadastra uma conta de exibidor com um estabelecimento e o ponto confirmado.
- **Então:**
  - a resposta é 201
  - o estabelecimento fica gravado na posição confirmada

#### API-CADASTRO-02
- **Dado:** `conta-exibidor`.
- **Quando:** a conta acrescenta o papel anunciante.
- **Então:**
  - a resposta é 200
  - a conta tem os papéis exibidor e anunciante

#### API-CADASTRO-03
- **Dado:** `conta-exibidor`.
- **Quando:** a pessoa cadastra outra conta com o documento 12345678909.
- **Então:**
  - a resposta é 409
  - continua existindo uma conta só com esse documento
