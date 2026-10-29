# Roadmap: Agenda Barbearia

Gerado de `prd.md` versão 0.1.0 pela skill prd-writer. Status se muda na coluna Status da tabela de ondas (pendente, em andamento, feito, bloqueado, removido; bloqueado exige motivo em Observação). Grafo, ondas e situação são regenerados a partir dos blocos 'Depende de' de cada RF no PRD; para mudar uma dependência, mude o PRD.

## Situação

- Concluídos: 1 de 5 RFs (20 por cento)
- Onda atual: 2
- Liberados para começar: nenhum
- Em andamento: RF-002
- Bloqueados: nenhum
- Caminho crítico restante: RF-002 → RF-003 (2 RFs)

## Grafo

Aresta A → B: B não pode ser construído ou validado sem A.

```mermaid
graph LR
  DEP1{{"DEP-1 canal de mensagens ao cliente"}}:::externa
  RF001["RF-001 Cadastrar serviços e barbeiros"]:::feito
  RF002["RF-002 Marcar horário"]:::andamento
  RF003["RF-003 Enviar lembrete"]:::pendente
  RF004["RF-004 Cancelar ou remarcar"]:::pendente
  RF005["RF-005 Ver agenda do dia"]:::pendente
  RF001 -->|dado| RF002
  RF002 -->|dado| RF003
  DEP1 -->|fluxo| RF003
  RF002 -->|dado| RF004
  RF002 -->|dado| RF005
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
| 1 | RF-001 | Cadastrar serviços e barbeiros | alta | feito |  | nenhum |
| 2 | RF-002 | Marcar horário | alta | em andamento |  | RF-001 |
| 3 | RF-003 | Enviar lembrete | alta | pendente |  | DEP-1, RF-002 |
| 3 | RF-004 | Cancelar ou remarcar | alta | pendente |  | RF-002 |
| 3 | RF-005 | Ver agenda do dia | media | pendente |  | RF-002 |

Dependências externas no grafo
- DEP-1 canal de mensagens ao cliente
