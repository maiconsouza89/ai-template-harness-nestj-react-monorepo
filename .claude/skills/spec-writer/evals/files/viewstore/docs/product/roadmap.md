# Roadmap: viewstore

Gerado de `prd.md` versão 0.1.2 pela skill prd-writer. Status se muda na coluna Status da tabela de ondas (pendente, em andamento, feito, bloqueado, removido; bloqueado exige motivo em Observação). Grafo, ondas e situação são regenerados a partir dos blocos 'Depende de' de cada RF no PRD; para mudar uma dependência, mude o PRD.

## Situação

- Concluídos: 0 de 17 RFs (0 por cento)
- Onda atual: 1
- Liberados para começar: RF-001 (depende de DEP-2), RF-017
- Em andamento: nenhum
- Bloqueados: nenhum
- Caminho crítico restante: RF-001 → RF-002 → RF-008 → RF-010 → RF-014 → RF-015 (6 RFs)

## Grafo

Aresta A → B: B não pode ser construído ou validado sem A.

```mermaid
graph LR
  DEP1{{"DEP-1 serviço de pagamento"}}:::externa
  DEP2{{"DEP-2 serviço de mapas e localização"}}:::externa
  RF001["RF-001 Criar conta de exibidor ou anunciante"]:::pendente
  RF017["RF-017 Configurar planos e parâmetros comerciais"]:::pendente
  RF002["RF-002 Cadastrar tela"]:::pendente
  RF003["RF-003 Enviar criativo"]:::pendente
  RF004["RF-004 Moderar criativos de anunciantes"]:::pendente
  RF007["RF-007 Assinar plano pago"]:::pendente
  RF008["RF-008 Definir preço e ciclo da tela pública"]:::pendente
  RF012["RF-012 Reproduzir programação e registrar exibições"]:::pendente
  RF005["RF-005 Programar tela privada"]:::pendente
  RF010["RF-010 Contratar anúncio direto"]:::pendente
  RF011["RF-011 Contratar pacote de rede"]:::pendente
  RF009["RF-009 Localizar telas públicas no mapa"]:::pendente
  RF006["RF-006 Aplicar brand do freemium"]:::pendente
  RF014["RF-014 Repassar valores ao exibidor"]:::pendente
  RF013["RF-013 Painel do anunciante com comprovação"]:::pendente
  RF015["RF-015 Painel do exibidor"]:::pendente
  RF016["RF-016 Painel do operador (hipótese)"]:::pendente
  DEP2 -->|fluxo| RF001
  RF001 -->|dado| RF002
  RF001 -->|dado| RF003
  RF003 -->|dado| RF004
  RF003 -->|dado| RF005
  RF012 -->|fluxo| RF005
  RF005 -->|fluxo| RF006
  RF007 -->|dado| RF006
  RF002 -->|dado| RF007
  RF017 -->|dado| RF007
  DEP1 -->|fluxo| RF007
  RF002 -->|dado| RF008
  RF017 -->|regra| RF008
  RF008 -->|dado| RF009
  RF004 -->|fluxo| RF010
  RF008 -->|dado| RF010
  DEP1 -->|fluxo| RF010
  RF004 -->|fluxo| RF011
  RF008 -->|dado| RF011
  DEP1 -->|fluxo| RF011
  RF002 -->|dado| RF012
  RF010 -->|dado| RF013
  RF011 -->|dado| RF013
  RF012 -->|dado| RF013
  RF010 -->|dado| RF014
  RF011 -->|dado| RF014
  RF012 -->|dado| RF014
  RF014 -->|dado| RF015
  RF007 -->|dado| RF016
  RF014 -->|dado| RF016
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
| 1 | RF-001 | Criar conta de exibidor ou anunciante | alta | pendente |  | DEP-2 |
| 1 | RF-017 | Configurar planos e parâmetros comerciais | alta | pendente |  | nenhum |
| 2 | RF-002 | Cadastrar tela | alta | pendente |  | RF-001 |
| 2 | RF-003 | Enviar criativo | alta | pendente |  | RF-001 |
| 3 | RF-004 | Moderar criativos de anunciantes | alta | pendente |  | RF-003 |
| 3 | RF-007 | Assinar plano pago | alta | pendente |  | DEP-1, RF-002, RF-017 |
| 3 | RF-008 | Definir preço e ciclo da tela pública | alta | pendente |  | RF-002, RF-017 |
| 3 | RF-012 | Reproduzir programação e registrar exibições | alta | pendente |  | RF-002 |
| 4 | RF-005 | Programar tela privada | alta | pendente |  | RF-003, RF-012 |
| 4 | RF-010 | Contratar anúncio direto | alta | pendente |  | DEP-1, RF-004, RF-008 |
| 4 | RF-011 | Contratar pacote de rede | alta | pendente |  | DEP-1, RF-004, RF-008 |
| 4 | RF-009 | Localizar telas públicas no mapa | media | pendente |  | RF-008 |
| 5 | RF-006 | Aplicar brand do freemium | alta | pendente |  | RF-005, RF-007 |
| 5 | RF-014 | Repassar valores ao exibidor | alta | pendente |  | RF-010, RF-011, RF-012 |
| 5 | RF-013 | Painel do anunciante com comprovação | media | pendente |  | RF-010, RF-011, RF-012 |
| 6 | RF-015 | Painel do exibidor | media | pendente |  | RF-014 |
| 6 | RF-016 | Painel do operador (hipótese) | media | pendente |  | RF-007, RF-014 |

Dependências externas no grafo
- DEP-1 serviço de pagamento
- DEP-2 serviço de mapas e localização
