# PRD: [nome do sistema]

Versão: 0.1.0
Data: AAAA-MM-DD
Responsável: [nome de quem responde pelo PRD]

---

## Resumo

[Até 5 frases: o que é o sistema, para quem, qual problema resolve e qual resultado de negócio se espera.]

---

## Contexto e problema

Público-alvo
- [público 1, com o que o caracteriza]
- [público 2]

Cenários de uso chave
- [cenário 1: quem faz o quê, em que situação]
- [cenário 2]

Contexto de implantação
- [sistema novo | substitui o processo ou sistema X | integra-se a Y. Descreva o que o sistema existente faz, não como é feito]

Problemas priorizados
- [problema 1. Impacto: número aproximado (custo, tempo, erro, cliente). Prioridade: alta|media|baixa]
- [problema 2. Impacto: ... Prioridade: ...]

---

## Objetivos e métricas

| Objetivo | Métrica | Meta |
| --- | --- | --- |
| [objetivo 1] | [como se mede] | [número e prazo] |
| [objetivo 2] | [métrica 2] | [meta 2] |

---

## Escopo

Incluso
- [o que precisa existir nesta entrega]

Fora de escopo
- [o que explicitamente não entra, e em uma palavra por quê, quando ajudar]

---

## Requisitos funcionais

### RF-001 [nome do requisito]
[Uma frase: o que o sistema tem que fazer.]

**Para quem:** [público do Contexto que este RF atende, e o que ganha com ele]

**Fluxo principal**
- [passo 1]
- [passo 2]
- [passo 3]

**Fluxos alternativos e exceções**
- [variação ou exceção 1]

**Erros previstos**
- [condição que bloqueia ou retorna erro, e o que o usuário vê. Bloco obrigatório só quando o RF cria, altera ou apaga dado, mexe com dinheiro ou permissão, ou é irreversível]

**Prioridade:** alta

**Critérios de aceitação**
- [resultado verificável do fluxo principal]
- [resultado verificável de uma falha ou exceção]

---

### RF-002 [nome do requisito 2]
[descrição]

**Para quem:** [público e ganho]

**Depende de**
- RF-001 (dado): [o que este RF lê ou altera e que RF-001 cria]
- DEP-1 (fluxo): [o que precisa chegar de fora antes. Motivo: dado, fluxo ou regra. Omita o bloco se o RF não depende de nada]

**Fluxo principal**
- [passo 1]
- [passo 2]
- [passo 3]

**Fluxos alternativos e exceções**
- [variação ou exceção]

**Prioridade:** media

**Critérios de aceitação**
- [critério de sucesso]
- [critério de falha]

---

## Requisitos não funcionais

Performance
- [meta observável pelo usuário. ex: busca de produto responde em até 1 segundo para 95 por cento das consultas]

Disponibilidade
- [ex: 99.9 por cento de disponibilidade mensal no horário comercial]

Segurança e autorização
- [ex: quem pode fazer o quê, por papel; alterações sensíveis registradas com autor e horário]

Auditoria e rastreabilidade
- [ex: toda falha de pagamento é rastreável até o pedido e o cliente]

Confiabilidade e integridade de dados
- [ex: estoque nunca fica negativo; venda e baixa de estoque acontecem juntas ou não acontecem]

Compatibilidade
- [ex: navegadores dos últimos 2 anos em desktop e celular; português do Brasil]

Compliance
- [ex: dados pessoais tratados conforme a LGPD, com exclusão sob pedido em até 15 dias]

Acessibilidade
- [ex: fluxos principais operáveis por teclado e leitor de tela, WCAG 2.1 nível AA]

---

## Decisões de produto e trade-offs

### Decisão: [regra de produto já dada 1]
- **Justificativa:** [por que]
- **Trade-off:** [o que se perde ou fica limitado]

### Decisão: [decisão 2]
- **Justificativa:** [por que]
- **Trade-off:** [custo ou limitação]

---

## Dependências

### DEP-1 [externa|organizacional|pré-requisito]: [título]
[Quem precisa entregar o quê, por quê e o que trava enquanto não chega. O RF que ela trava a cita no próprio 'Depende de'.]

### DEP-2 [tipo]: [título 2]
[descrição]

---

## Riscos e mitigação

### [risco 1 em uma frase]
- **Probabilidade:** [baixa|media|alta]
- **Impacto:** [o que acontece se ocorrer]
- **Mitigação:**
  - [ação 1]
  - [ação 2]
- **Plano de contingência:** [plano B se ocorrer mesmo assim]

### [risco 2 em uma frase]
- **Probabilidade:** [baixa|media|alta]
- **Impacto:** [impacto]
- **Mitigação:**
  - [ação]
- **Plano de contingência:** [plano B]

---

## Critérios de aceitação

Critérios de cada RF ficam no próprio RF. Aqui ficam só os transversais.

Integração entre requisitos
- RF-001 → RF-002: [o dado criado em RF-001 chega correto em RF-002. Um critério por item 'dado' de 'Depende de']

Transversais
- [critério que vale para o sistema todo, derivado de meta ou requisito não funcional, verificável por alguém de fora do time]

---

## Validação

Tipos de validação obrigatórios
- [ex: testes automatizados das regras de negócio críticas]
- [ex: teste de ponta a ponta do fluxo principal de cada RF de prioridade alta]
- [ex: validação de carga na meta de performance declarada]

Estratégia de validação
- [ex: roteiro de aceitação executado com usuários reais antes de liberar; validação exploratória interna por sprint]
