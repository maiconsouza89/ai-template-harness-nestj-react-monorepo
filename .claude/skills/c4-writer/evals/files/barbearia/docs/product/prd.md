# PRD: Agenda Barbearia

Versão: 0.2.0
Data: 2026-10-01
Responsável: Dono da barbearia

---

## Resumo

Sistema de agendamento online para barbearias de 1 a 5 cadeiras. O cliente marca pelo celular sem instalar nada, recebe lembrete e pode cancelar. O dono deixa de responder mensagem e acompanha a agenda do dia. O resultado esperado é reduzir o não comparecimento pela metade em 3 meses.

---

## Contexto e problema

Público-alvo
- Dono da barbearia: configura serviços e barbeiros, acompanha a agenda de todos
- Cliente final: marca, cancela e remarca pelo celular

Cenários de uso chave
- Cliente marca corte para sábado às 10h pelo link da barbearia
- Dono abre a agenda do dia às 8h para ver quem vem

Contexto de implantação
- Substitui agenda de papel e marcação por mensagem

Problemas priorizados
- Horários perdidos por desencontro e falta. Impacto: 8 a 10 horários por semana. Prioridade: alta
- Dono responde mensagem o dia todo. Impacto: 1 hora por dia. Prioridade: alta

---

## Objetivos e métricas

| Objetivo | Métrica | Meta |
| --- | --- | --- |
| Reduzir falta | Horários perdidos por semana | de 9 para 4 em 3 meses |
| Tirar o dono da mensagem | Tempo diário respondendo marcação | menos de 10 minutos em 2 meses |

---

## Escopo

Incluso
- Cadastro de serviços e barbeiros, marcação pelo cliente, lembrete, cancelamento e agenda do dono

Fora de escopo
- Pagamento online do serviço
- Programa de fidelidade

---

## Requisitos funcionais

### RF-001 Cadastrar serviços e barbeiros
O dono cadastra serviços com duração e preço e barbeiros com horário de trabalho.

**Para quem:** dono da barbearia, para que a grade de horários reflita o que a barbearia oferece.

**Fluxo principal**
- Dono abre a área de configuração
- Cadastra serviço com nome, duração e preço
- Cadastra barbeiro com dias e horários de trabalho
- Sistema publica a grade de horários livres

**Fluxos alternativos e exceções**
- Dono desativa um barbeiro de férias e a grade dele some

**Erros previstos**
- Serviço sem duração é recusado com aviso no campo

**Prioridade:** alta

**Critérios de aceitação**
- Serviço salvo aparece na escolha de serviço do cliente com duração e preço
- Serviço sem duração não é salvo e o campo é destacado

---

### RF-002 Marcar horário
O cliente escolhe serviço, barbeiro, dia e horário livre e confirma com nome e telefone.

**Para quem:** cliente final, para marcar sem depender de mensagem.

**Depende de**
- RF-001 (dado): serviços com duração e preço, barbeiros e horários de trabalho

**Fluxo principal**
- Cliente abre o link da barbearia
- Escolhe serviço e barbeiro ou "qualquer"
- Escolhe dia e horário livre
- Confirma com nome e telefone
- Sistema reserva o horário e mostra a confirmação

**Fluxos alternativos e exceções**
- Com "qualquer", o sistema escolhe o barbeiro livre com menos marcações no dia

**Erros previstos**
- Horário ocupado entre a escolha e a confirmação: aviso e sugestão do próximo livre

**Prioridade:** alta

**Critérios de aceitação**
- Horário confirmado deixa de aparecer como livre para outros clientes
- Duas confirmações simultâneas no mesmo horário resultam em uma reserva e um aviso

---

### RF-003 Enviar lembrete
O sistema avisa o cliente 24 horas e 2 horas antes do horário, com opção de cancelar.

**Para quem:** cliente final, para não esquecer; dono, para reduzir falta.

**Depende de**
- RF-002 (dado): horário marcado, nome e telefone do cliente
- DEP-1 (fluxo): canal pelo qual o lembrete chega ao cliente

**Fluxo principal**
- Sistema identifica marcações a 24 horas e a 2 horas
- Envia mensagem com dia, horário, serviço e link de cancelamento
- Registra o envio na marcação

**Fluxos alternativos e exceções**
- Marcação feita com menos de 2 horas recebe só a confirmação

**Erros previstos**
- Falha no envio fica registrada e aparece na agenda do dono

**Prioridade:** alta

**Critérios de aceitação**
- Marcação para amanhã às 10h recebe lembrete hoje às 10h e amanhã às 8h
- Envio que falha aparece marcado na agenda do dono

---

### RF-004 Cancelar ou remarcar
O cliente cancela ou muda o horário até 2 horas antes.

**Para quem:** cliente final, para não precisar ligar; dono, para liberar o horário a tempo.

**Depende de**
- RF-002 (dado): marcação existente com horário e cliente

**Fluxo principal**
- Cliente abre o link do lembrete ou da confirmação
- Escolhe cancelar ou remarcar
- Ao remarcar, escolhe novo horário livre
- Sistema libera o horário antigo

**Fluxos alternativos e exceções**
- Dentro das 2 horas finais, o link mostra o telefone da barbearia

**Erros previstos**
- Tentativa com menos de 2 horas é recusada com o telefone da barbearia

**Prioridade:** alta

**Critérios de aceitação**
- Cancelamento até 2 horas antes libera o horário na grade imediatamente
- Cancelamento com menos de 2 horas é recusado e mostra o telefone

---

### RF-005 Ver agenda do dia
O dono vê a agenda do dia de todos os barbeiros e marca horários manualmente.

**Para quem:** dono da barbearia, para organizar o dia e atender quem liga.

**Depende de**
- RF-002 (dado): marcações do dia com cliente, serviço e barbeiro

**Fluxo principal**
- Dono abre a agenda
- Sistema mostra as marcações do dia por barbeiro
- Dono marca um horário para cliente que ligou

**Fluxos alternativos e exceções**
- Dono navega para outro dia

**Prioridade:** media

**Critérios de aceitação**
- Agenda mostra todas as marcações do dia separadas por barbeiro
- Marcação feita pelo dono some da grade livre do cliente

---

## Requisitos não funcionais

Performance
- Grade de horários livres abre em até 2 segundos no celular para 95 por cento dos acessos (hipótese)

Disponibilidade
- 99.5 por cento mensal entre 7h e 22h (hipótese)

---

## Decisões de produto e trade-offs

### Decisão: cancelamento só até 2 horas antes
- **Justificativa:** dá tempo de outro cliente ocupar o horário
- **Trade-off:** cliente com imprevisto de última hora precisa ligar

---

## Dependências

### DEP-1 externa: canal de mensagens ao cliente
Serviço de terceiro que entrega mensagem no celular do cliente. Sem ele, RF-003 não funciona.

---

## Riscos e mitigação

### Clientes não usam o link e continuam mandando mensagem
- **Probabilidade:** media
- **Impacto:** dono segue respondendo mensagem e a meta de tempo não é atingida
- **Mitigação:**
  - resposta automática com o link no canal atual
- **Plano de contingência:** dono marca pela agenda (RF-005) para quem insistir

---

## Critérios de aceitação

Critérios de cada RF ficam no próprio RF. Aqui ficam só os transversais.

Integração entre requisitos
- RF-001 → RF-002: serviço criado no cadastro aparece na marcação com a duração correta
- RF-002 → RF-003: marcação confirmada recebe lembrete com o mesmo horário e telefone
- RF-002 → RF-004: marcação feita pode ser cancelada pelo link da confirmação
- RF-002 → RF-005: marcação feita pelo cliente aparece na agenda do dono sem recarregar

Transversais
- Toda marcação, cancelamento e remarcação fica registrada com autor e horário

---

## Validação

Tipos de validação obrigatórios
- Testes automatizados da regra de 2 horas e da reserva simultânea

Estratégia de validação
- Piloto de 2 semanas em uma barbearia antes de liberar
