# Roadmap: Template de aplicação web com contas e tarefas

Gerado de `prd.md` versão 0.1.0 pela skill prd-writer. Status se muda na coluna Status da tabela de ondas (pendente, em andamento, feito, bloqueado, removido; bloqueado exige motivo em Observação). Grafo, ondas e situação são regenerados a partir dos blocos 'Depende de' de cada RF no PRD; para mudar uma dependência, mude o PRD.

## Situação

- Concluídos: 1 de 13 RFs (8 por cento)
- Onda atual: 2
- Liberados para começar: RF-002, RF-005
- Em andamento: nenhum
- Bloqueados: nenhum
- Caminho crítico restante: RF-002 → RF-003 → RF-008 → RF-009 (4 RFs)

## Grafo

Aresta A → B: B não pode ser construído ou validado sem A.

```mermaid
graph LR
  DEP1{{"DEP-1 serviço de envio de e-mail"}}:::externa
  RF001["RF-001 Criar conta"]:::feito
  RF002["RF-002 Confirmar e-mail"]:::pendente
  RF005["RF-005 Recuperar senha"]:::pendente
  RF003["RF-003 Entrar"]:::pendente
  RF004["RF-004 Sair"]:::pendente
  RF008["RF-008 Criar tarefa"]:::pendente
  RF006["RF-006 Editar perfil"]:::pendente
  RF007["RF-007 Alterar senha"]:::pendente
  RF012["RF-012 Listar usuários"]:::pendente
  RF009["RF-009 Listar tarefas"]:::pendente
  RF010["RF-010 Editar e concluir tarefa"]:::pendente
  RF011["RF-011 Excluir tarefa"]:::pendente
  RF013["RF-013 Alterar papel ou desativar usuário"]:::pendente
  DEP1 -->|fluxo| RF001
  RF001 -->|dado| RF002
  RF002 -->|dado| RF003
  RF003 -->|fluxo| RF004
  RF001 -->|dado| RF005
  RF003 -->|fluxo| RF006
  RF003 -->|fluxo| RF007
  RF003 -->|fluxo| RF008
  RF008 -->|dado| RF009
  RF008 -->|dado| RF010
  RF008 -->|dado| RF011
  RF003 -->|fluxo| RF012
  RF012 -->|fluxo| RF013
  classDef pendente fill:#eceff1,stroke:#607d8b,color:#263238
  classDef andamento fill:#fff3c4,stroke:#f9a825,color:#3e2723
  classDef feito fill:#2e7d32,stroke:#1b5e20,color:#ffffff
  classDef bloqueado fill:#c62828,stroke:#8e0000,color:#ffffff
  classDef externa fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
```

Legenda: cinza pendente, amarelo em andamento, verde feito, vermelho bloqueado, azul dependência externa.

## Ondas

RFs da mesma onda podem ser desenvolvidos em paralelo.

| Onda | RF | Nome | Prioridade | Status | Observação | Depende de |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | RF-001 | Criar conta | alta | feito | avaliação limpa em docs/features/RF-001-criar-conta/avaliacao.md | DEP-1 |
| 2 | RF-002 | Confirmar e-mail | alta | pendente |  | RF-001 |
| 2 | RF-005 | Recuperar senha | media | pendente |  | RF-001 |
| 3 | RF-003 | Entrar | alta | pendente |  | RF-002 |
| 4 | RF-004 | Sair | alta | pendente |  | RF-003 |
| 4 | RF-008 | Criar tarefa | alta | pendente |  | RF-003 |
| 4 | RF-006 | Editar perfil | media | pendente |  | RF-003 |
| 4 | RF-007 | Alterar senha | media | pendente |  | RF-003 |
| 4 | RF-012 | Listar usuários | media | pendente |  | RF-003 |
| 5 | RF-009 | Listar tarefas | alta | pendente |  | RF-008 |
| 5 | RF-010 | Editar e concluir tarefa | alta | pendente |  | RF-008 |
| 5 | RF-011 | Excluir tarefa | alta | pendente |  | RF-008 |
| 5 | RF-013 | Alterar papel ou desativar usuário | media | pendente |  | RF-012 |

Dependências externas no grafo
- DEP-1 serviço de envio de e-mail
