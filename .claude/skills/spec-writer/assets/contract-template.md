# Contrato: RF-NNN [nome do RF, igual ao PRD]

*Gerado pela skill spec-writer. Edições à mão são sobrescritas na regeneração.*

## Pré-requisitos

### Serviços em execução
- [processo ou serviço que precisa estar no ar para os itens rodarem, pelo nome do componente do HLD]

### Estado persistido
- `[handle]`: [o que existe dentro do sistema, de forma declarativa: entidade, atributos e relações]. Usado por: [ID, ID]

### Entradas estáticas
- `[caminho/do/arquivo.ext]`: [o que o arquivo é e o que tem de especial]. Usado por: [ID]

### Configuração
- [variável, flag ou mecanismo de teste que os itens exigem, no arquivo de configuração de teste do projeto]

### Dependências externas
- [DEP-N ou serviço externo do fecho, e como é simulado no padrão de mocks do projeto]

## Gates de qualidade

Cada gate precisa passar para a feature ser considerada pronta.

- **[nome]**: `[comando literal]`. [O que significa passar, em uma frase.]

## Manifesto de cobertura

| Critério de aceitação | Coberto por |
| --- | --- |
| [texto literal do critério do RF no PRD] | [ID, ID] |
| [RF-NNN → RF-NNN: texto literal do critério de integração em que este RF é o destino] | [ID] |

## API HTTP

Modo de verificação: [como se exercita esta superfície, sem nomear quem executa. ex: requisições HTTP contra a API em execução, inspecionando status, corpo e estado persistido]

### [Capacidade, no vocabulário do produto]

Dado comum: [condição repetida em todos os itens da capacidade; omita a linha se não houver]

#### API-[CAPACIDADE]-01
- **Dado:** [estado inicial, citando handles de Pré-requisitos]
- **Quando:** [uma ação]
- **Então:**
  - [uma observação verificável por linha]
  - [outra observação]

## E2E

Modo de verificação: [ex: navegador dirigindo o painel contra o sistema completo em execução]

### [Capacidade]

#### E2E-[CAPACIDADE]-01
- **Dado:** [estado inicial]
- **Quando:** [jornada em uma frase]
- **Então:**
  - [observação]
- **Notas:** [só quando necessário, ex: subjetivo; só revisão manual]
