# Spec: RF-NNN [nome do RF, igual ao PRD]

PRD: docs/product/prd.md versão [X.Y.Z]
HLD: docs/architecture/hld.md versão [X.Y.Z, ou "não existe"]
Complexidade: [trivial|simples|média|complexa]

---

## Escopo

Incluído
- [o que esta feature entrega, derivado do fluxo principal, das exceções e dos erros previstos do RF]

Entradas
- [RF-NNN (dado): o que esta feature lê de uma dependência, e por qual interface ou tabela. Sem dependência, "nenhuma"]

Saídas
- [o que esta feature expõe e que os dependentes diretos vão consumir: endpoint, evento, tabela, tela. Sem dependentes, "nenhuma"]

Fora desta spec
- [o que parece fazer parte mas é de outro RF ou da fundação, com o número]

---

## Regras e fluxos

[Regras de negócio que o código precisa garantir, tiradas do RF, das decisões de produto e dos requisitos não funcionais que se aplicam. Uma linha por regra, verificável. Depois, o fluxo técnico do caso principal em 3 a 8 passos, citando os componentes pelo nome do HLD.]

---

## Componentes

| Componente do HLD | Caminho | O que muda nesta feature |
| --- | --- | --- |
| [nome exato da tabela de componentes do HLD] | [caminho completo do arquivo ou módulo, no padrão do código] | [novo, ou o que é alterado, em 1 a 2 frases] |

---

## Contratos de interface

[Cada endpoint, evento, comando ou mensagem que entra ou sai da feature: método e caminho (ou nome do evento), autenticação, corpo de entrada e de saída com exemplo JSON, códigos de erro. Só a estrutura; o código fica no código. Se a feature não expõe nem consome interface, uma linha dizendo isso e por quê.]

---

## Modelo de dados

[Tabelas ou coleções novas e alteradas: coluna, tipo, nulo, padrão, índices, constraints e a migração necessária, descrita (não escrita). Se a feature não persiste nada, uma linha dizendo isso e por quê.]

---

## Tratamento de erros

| Erro | Onde é detectado | Resposta do sistema | O que a pessoa vê |
| --- | --- | --- | --- |
| [cada item de "Erros previstos" do RF, e os erros técnicos que o desenho cria] | [componente] | [código, rollback, retentativa] | [mensagem ou estado da tela] |

---

## Estratégia de testes

[Arquivos de teste e funções de teste por nível (unidade, integração, interface, ponta a ponta), no framework e na pasta que o código já usa. É orientação para quem implementa: não amarra teste a critério de aceitação, isso é do contract.md.]

Verificação por superfície

| Superfície | Mecanismo | Decisão |
| --- | --- | --- |
| [cada superfície do contract.md, com o nome da seção: API HTTP, CLI, UI, Worker...] | [como ela é exercitada: requisições HTTP, comando na raiz, navegador dirigido por ferramenta] | [ADR-NNNN da ferramenta; "não precisa" quando o mecanismo é genérico; "fundação" num RF que herda a linha da fundação; ou "pendente de ADR"] |

---

## Decisões e hipóteses

Decisões
- [decisão técnica desta feature e quem a tomou: escolhida na entrevista, ADR-NNNN, ou padrão do código em caminho]

Hipóteses
- [o que foi completado sem o usuário decidir, uma por linha, terminando em (hipótese). Sem hipóteses, "nenhuma"]

Pendentes de ADR
- [tecnologia nova ou decisão cara de reverter que esta feature precisa e nenhum ADR aceito cobre, com as opções e o critério. Sem pendências, "nenhuma"]

---

## Rastreabilidade

| Bloco do PRD ou do HLD | Onde está nesta spec |
| --- | --- |
| Fluxo principal | Regras e fluxos |
| Fluxos alternativos e exceções | [seção] |
| Erros previstos | Tratamento de erros |
| Depende de | Escopo, Entradas |
| [linha do RF na rastreabilidade do HLD] | Componentes |
