# PRD: Template de aplicação web com contas e tarefas

Versão: 0.1.0
Data: 2026-10-28
Responsável: Maicon Souza

---

## Resumo

Template de repositório no GitHub para iniciar aplicações web, entregando pronto um app de exemplo com contas de usuário e um cadastro de tarefas. O público principal são devs que criam um projeto novo a partir do template e querem partir de acesso, permissões, envio de e-mail e um CRUD funcionando. Hoje cada projeto novo gasta de 1 a 3 dias montando essa base antes da primeira feature real. O resultado esperado é ter o app rodando localmente em até 15 minutos e criar um CRUD novo, copiando o padrão de tarefas, em até 2 horas.

---

## Contexto e problema

Público-alvo
- Dev que inicia projeto: cria um repositório a partir do template, roda o app de exemplo e o adapta ao próprio domínio. Público principal.
- Pessoa usuária do app de exemplo: cria conta, entra e gerencia as próprias tarefas. Público secundário, existe para o exemplo ser realista.
- Admin do app de exemplo: gerencia as contas (papel e situação). O primeiro admin nasce na instalação.

Cenários de uso chave
- Dev cria o repositório pelo template, segue o README e em até 15 minutos tem o app rodando localmente com cadastro, login e tarefas.
- Dev cria uma entidade nova do próprio domínio copiando o padrão do cadastro de tarefas (tela, regras e testes).
- Pessoa usuária cria conta, confirma o e-mail, entra e cria, lista, edita, conclui e exclui as próprias tarefas.
- Pessoa usuária esquece a senha e define uma nova pelo link recebido por e-mail.
- Admin busca uma conta, promove a admin ou desativa.

Contexto de implantação
- Sistema novo, construído sobre o harness já presente no repositório (verificações, hooks, skills de documentação e release automática). Não substitui nem se integra a sistema existente; a única integração é o envio de e-mail.

Problemas priorizados
- Cada projeto novo gasta de 1 a 3 dias montando estrutura, acesso com login e um primeiro CRUD antes da primeira feature real. Impacto: 1 a 3 dias de dev por projeto. Prioridade: alta

---

## Objetivos e métricas

| Objetivo | Métrica | Meta |
| --- | --- | --- |
| Reduzir o tempo de início de projeto | Tempo entre criar o repositório pelo template e ter o app rodando localmente com cadastro, login e tarefas funcionando, medido em ensaio cronometrado por alguém de fora | Até 15 minutos, em todo ensaio a partir da versão 1.0.0 |
| Servir de modelo para novas entidades | Tempo para um dev criar uma entidade nova com tela e testes seguindo o padrão de tarefas | Até 2 horas, a partir da versão 1.0.0 |

---

## Escopo

Incluso
- Criação de conta com confirmação obrigatória por e-mail.
- Entrar e sair, com bloqueio temporário após tentativas erradas.
- Recuperação de senha por e-mail.
- Perfil: ver dados da conta, editar o nome e alterar a senha.
- Papéis usuário e admin; o admin lista, busca, promove, rebaixa, desativa e reativa contas.
- Primeiro admin criado na instalação.
- CRUD de tarefas privado de cada pessoa, com filtro por situação e paginação.
- Envio de e-mails transacionais (confirmação de conta, recuperação de senha, aviso de troca de senha), visíveis numa caixa de teste no ambiente local.

Fora de escopo
- Login com provedor externo (Google, GitHub): fica para o projeto gerado, se precisar.
- Várias empresas ou organizações: todos os usuários estão num espaço só.
- Anexos em tarefas e notificações no app ou push: o único canal é e-mail.
- Autenticação em dois fatores.
- Troca do próprio e-mail: o e-mail é fixo depois do cadastro.
- Exclusão da própria conta pela pessoa: o admin desativa a conta quando pedido.
- Admin ver ou alterar tarefas de outras pessoas.
- Lixeira ou restauração de tarefas excluídas.
- Busca textual em tarefas: só filtro por situação.
- Interface em outros idiomas além do português do Brasil.

---

## Requisitos funcionais

### RF-001 Criar conta
O sistema cria uma conta pendente de confirmação a partir de nome, e-mail e senha e envia o link de confirmação por e-mail.

**Para quem:** pessoa usuária do app de exemplo, que ganha acesso próprio; dev, que parte de um cadastro pronto.

**Depende de**
- DEP-1 (fluxo): envio do e-mail com o link de confirmação.

**Fluxo principal**
- A pessoa abre a tela de cadastro.
- Informa nome, e-mail e senha.
- O sistema valida os campos e a regra de senha.
- O sistema cria a conta com papel usuário e situação pendente.
- O sistema envia o e-mail com o link de confirmação, válido por 24 horas.
- A tela informa que o link foi enviado e que é preciso confirmar antes de entrar.

**Fluxos alternativos e exceções**
- E-mail informado com letras maiúsculas é tratado igual ao mesmo e-mail em minúsculas.

**Erros previstos**
- E-mail já cadastrado: a tela informa que o e-mail já tem conta e sugere entrar ou recuperar a senha.
- Senha fora da regra: a tela mostra a regra (mínimo de 8 caracteres, com letra e número) e não cria a conta.
- Campo obrigatório vazio ou e-mail inválido: a tela aponta o campo e não cria a conta.
- Falha no envio do e-mail: a conta é criada e a tela oferece reenviar o link.

**Prioridade:** alta

**Critérios de aceitação**
- Cadastro com dados válidos cria conta pendente com papel usuário e gera um e-mail de confirmação para o endereço informado.
- Cadastro com e-mail já existente, mesmo com outra combinação de maiúsculas, é recusado e não cria segunda conta.
- Senha sem número, sem letra ou com menos de 8 caracteres é recusada com a regra exibida.
- A senha nunca aparece em texto puro na tela, no e-mail ou em registros do sistema.

---

### RF-002 Confirmar e-mail
O sistema ativa a conta quando a pessoa abre o link de confirmação dentro da validade.

**Para quem:** pessoa usuária do app de exemplo, que prova ser dona do e-mail e libera o acesso.

**Depende de**
- RF-001 (dado): a conta pendente e o link de confirmação gerados no cadastro.

**Fluxo principal**
- A pessoa abre o link recebido por e-mail.
- O sistema confere que o link existe, não venceu e não foi usado.
- O sistema muda a conta para ativa e invalida o link.
- A tela confirma a ativação e leva para entrar.

**Fluxos alternativos e exceções**
- A pessoa pede reenvio do link: um novo link de 24 horas é enviado e os anteriores deixam de valer.
- Conta já ativa: a tela informa que a conta já está confirmada e leva para entrar.

**Erros previstos**
- Link vencido: a tela informa que expirou e oferece reenviar.
- Link inválido ou já usado: a tela informa que o link não vale e oferece reenviar.

**Prioridade:** alta

**Critérios de aceitação**
- Link aberto dentro de 24 horas ativa a conta e não pode ser usado de novo.
- Link aberto depois de 24 horas não ativa a conta e a tela oferece reenvio.
- Depois de um reenvio, o link anterior não ativa mais a conta.

---

### RF-003 Entrar
O sistema abre uma sessão para a pessoa com conta ativa que informa e-mail e senha corretos.

**Para quem:** pessoa usuária e admin do app de exemplo, que acessam suas funções; dev, que parte de um login com as proteções básicas prontas.

**Depende de**
- RF-002 (dado): a situação ativa da conta, definida na confirmação.

**Fluxo principal**
- A pessoa abre a tela de entrar.
- Informa e-mail e senha.
- O sistema confere as credenciais e a situação da conta.
- O sistema abre a sessão.
- A tela leva para a lista de tarefas.

**Fluxos alternativos e exceções**
- Pessoa que tenta abrir uma página protegida sem sessão é levada para entrar e, depois de entrar, volta para a página que pediu.

**Erros previstos**
- E-mail ou senha errados: mensagem genérica "e-mail ou senha inválidos", sem dizer qual dos dois.
- 5 tentativas erradas seguidas para o mesmo e-mail: novas tentativas ficam bloqueadas por 15 minutos, com mensagem dizendo quando tentar de novo.
- Conta pendente de confirmação: a tela informa e oferece reenviar o link.

**Prioridade:** alta

**Critérios de aceitação**
- Conta ativa com credenciais corretas entra e vê a lista de tarefas.
- Credencial errada mostra a mesma mensagem genérica para e-mail inexistente e para senha errada.
- Na sexta tentativa depois de 5 erros seguidos, mesmo com a senha certa, o acesso é recusado até passarem 15 minutos.
- Conta pendente não entra e recebe a opção de reenviar o link.

---

### RF-004 Sair
O sistema encerra a sessão atual a pedido da pessoa.

**Para quem:** pessoa usuária e admin do app de exemplo, que protegem a conta em aparelho compartilhado.

**Depende de**
- RF-003 (fluxo): a sessão aberta ao entrar.

**Fluxo principal**
- A pessoa escolhe sair.
- O sistema encerra a sessão.
- A tela leva para entrar.

**Fluxos alternativos e exceções**
- Sessão já expirada: sair leva para entrar sem erro.

**Prioridade:** alta

**Critérios de aceitação**
- Depois de sair, abrir uma página protegida leva para entrar.
- Depois de sair, a sessão encerrada não dá acesso a nenhuma ação, mesmo reaproveitada.

---

### RF-005 Recuperar senha
O sistema permite definir uma nova senha a partir de um link de uso único enviado ao e-mail da conta.

**Para quem:** pessoa usuária e admin do app de exemplo, que recuperam o acesso sem depender de suporte.

**Depende de**
- RF-001 (dado): a conta e o e-mail cadastrados.

**Fluxo principal**
- A pessoa informa o e-mail na tela de recuperação.
- A tela responde sempre "se o e-mail tiver conta, enviamos o link".
- Se houver conta, o sistema envia o link, válido por 1 hora e de uso único.
- A pessoa abre o link e define a nova senha.
- O sistema troca a senha, invalida o link e encerra todas as sessões abertas da conta.
- A tela leva para entrar.

**Fluxos alternativos e exceções**
- Novo pedido de recuperação invalida os links anteriores.

**Erros previstos**
- Link vencido, já usado ou inválido: a tela informa e oferece pedir outro.
- Nova senha fora da regra: a tela mostra a regra e não troca a senha.

**Prioridade:** media

**Critérios de aceitação**
- E-mail com conta e e-mail sem conta recebem a mesma resposta na tela.
- Link aberto dentro de 1 hora troca a senha; a senha antiga deixa de entrar e a nova entra.
- Link usado uma vez ou aberto depois de 1 hora não troca a senha.
- Depois da troca, sessões abertas antes dela deixam de ter acesso.

---

### RF-006 Editar perfil
O sistema mostra os dados da própria conta e permite alterar o nome.

**Para quem:** pessoa usuária e admin do app de exemplo, que mantêm o nome atualizado; dev, que vê um exemplo de edição dos próprios dados.

**Depende de**
- RF-003 (fluxo): a sessão aberta identifica de quem é o perfil.

**Fluxo principal**
- A pessoa abre o perfil.
- A tela mostra nome, e-mail e papel.
- A pessoa altera o nome e salva.
- O sistema grava e confirma a alteração.

**Fluxos alternativos e exceções**
- E-mail e papel aparecem só para leitura.

**Erros previstos**
- Nome vazio: a tela aponta o campo e não salva.

**Prioridade:** media

**Critérios de aceitação**
- Nome alterado aparece no perfil e no restante do app depois de salvar.
- Nome vazio é recusado e o nome anterior permanece.
- Não há como alterar e-mail nem papel pelo perfil.

---

### RF-007 Alterar senha
O sistema troca a senha da pessoa logada mediante a senha atual e avisa por e-mail.

**Para quem:** pessoa usuária e admin do app de exemplo, que trocam a senha por segurança e ficam sabendo de troca que não fizeram.

**Depende de**
- RF-003 (fluxo): a sessão aberta identifica a conta.

**Fluxo principal**
- A pessoa abre a troca de senha no perfil.
- Informa a senha atual e a nova.
- O sistema confere a senha atual e a regra da nova.
- O sistema troca a senha e encerra as demais sessões da conta, mantendo a atual.
- O sistema envia e-mail avisando da troca.

**Fluxos alternativos e exceções**
- Nova senha igual à atual: a troca é aceita e o aviso é enviado do mesmo jeito.

**Erros previstos**
- Senha atual errada: a tela informa e não troca.
- Nova senha fora da regra: a tela mostra a regra e não troca.

**Prioridade:** media

**Critérios de aceitação**
- Com a senha atual certa, a nova senha passa a entrar e a antiga não.
- Com a senha atual errada, a senha não muda.
- Depois da troca, sessões abertas em outros aparelhos perdem o acesso e a sessão atual continua.
- Toda troca gera um e-mail de aviso para o endereço da conta.

---

### RF-008 Criar tarefa
O sistema cria uma tarefa pendente pertencente à pessoa logada.

**Para quem:** pessoa usuária do app de exemplo, que registra o que precisa fazer; dev, que tem o exemplo de criação a copiar.

**Depende de**
- RF-003 (fluxo): a sessão aberta define a dona da tarefa.

**Fluxo principal**
- A pessoa escolhe nova tarefa.
- Informa título (obrigatório) e descrição (opcional).
- O sistema valida e cria a tarefa como pendente, ligada a quem criou.
- A tarefa aparece no topo da lista.

**Fluxos alternativos e exceções**
- A pessoa cancela a criação e nada é gravado.

**Erros previstos**
- Título vazio: a tela aponta o campo e não cria.
- Sessão expirada: a tela leva para entrar e a tarefa não é criada.

**Prioridade:** alta

**Critérios de aceitação**
- Tarefa com título válido é criada como pendente e pertence a quem criou.
- Tarefa sem título é recusada.
- Tarefa criada por uma pessoa não aparece para nenhuma outra, admin incluído.

---

### RF-009 Listar tarefas
O sistema lista as tarefas da pessoa logada, das mais recentes para as mais antigas, com filtro por situação e 20 por página.

**Para quem:** pessoa usuária do app de exemplo, que acompanha o que falta fazer; dev, que tem o exemplo de consulta com filtro e paginação.

**Depende de**
- RF-008 (dado): as tarefas criadas e sua dona.

**Fluxo principal**
- A pessoa abre a lista de tarefas.
- O sistema mostra as 20 tarefas mais recentes dela.
- A pessoa escolhe o filtro: todas, pendentes ou concluídas.
- A pessoa navega entre as páginas.

**Fluxos alternativos e exceções**
- Sem tarefas no filtro escolhido: a tela mostra uma mensagem de lista vazia com atalho para criar tarefa.

**Prioridade:** alta

**Critérios de aceitação**
- A lista mostra só tarefas da pessoa logada, mais recentes primeiro, no máximo 20 por página.
- O filtro pendentes não mostra concluídas e o filtro concluídas não mostra pendentes.
- Com 21 tarefas, a primeira página mostra 20 e a segunda mostra 1.

---

### RF-010 Editar e concluir tarefa
O sistema altera título e descrição de uma tarefa e marca ou desmarca a tarefa como concluída.

**Para quem:** pessoa usuária do app de exemplo, que mantém as tarefas em dia; dev, que tem o exemplo de alteração e mudança de estado.

**Depende de**
- RF-008 (dado): a tarefa a alterar e sua dona.

**Fluxo principal**
- A pessoa abre uma tarefa dela.
- Altera título ou descrição e salva, ou marca como concluída.
- O sistema valida e grava.
- A tarefa aparece alterada na lista.

**Fluxos alternativos e exceções**
- Tarefa concluída pode ser desmarcada e volta a pendente.

**Erros previstos**
- Título vazio: a tela aponta o campo e não salva.
- Tarefa de outra pessoa ou inexistente: a resposta é "tarefa não encontrada", sem revelar se ela existe.

**Prioridade:** alta

**Critérios de aceitação**
- Título e descrição alterados aparecem na lista depois de salvar.
- Tarefa marcada como concluída passa a aparecer no filtro concluídas, e ao desmarcar volta às pendentes.
- Tentar alterar tarefa de outra pessoa responde "tarefa não encontrada" e não muda nada.

---

### RF-011 Excluir tarefa
O sistema exclui de forma definitiva uma tarefa da pessoa logada, depois de confirmação.

**Para quem:** pessoa usuária do app de exemplo, que remove o que não precisa mais; dev, que tem o exemplo de exclusão.

**Depende de**
- RF-008 (dado): a tarefa a excluir e sua dona.

**Fluxo principal**
- A pessoa escolhe excluir uma tarefa dela.
- A tela pede confirmação.
- A pessoa confirma.
- O sistema exclui a tarefa e ela some da lista.

**Fluxos alternativos e exceções**
- A pessoa cancela a confirmação e nada muda.

**Erros previstos**
- Tarefa de outra pessoa ou inexistente: a resposta é "tarefa não encontrada", sem revelar se ela existe.

**Prioridade:** alta

**Critérios de aceitação**
- Tarefa excluída com confirmação não aparece mais em nenhum filtro nem página.
- Cancelar a confirmação mantém a tarefa.
- Tentar excluir tarefa de outra pessoa responde "tarefa não encontrada" e não exclui nada.

---

### RF-012 Listar usuários
O sistema lista as contas para o admin, com busca por nome ou e-mail e 20 por página.

**Para quem:** admin do app de exemplo, que encontra uma conta para gerenciar; dev, que tem o exemplo de tela restrita por papel.

**Depende de**
- RF-003 (fluxo): a sessão aberta com papel admin.

**Fluxo principal**
- O admin abre a gestão de usuários.
- O sistema mostra nome, e-mail, papel e situação (pendente, ativa, desativada) de cada conta, 20 por página.
- O admin busca por parte do nome ou do e-mail.
- O sistema mostra as contas encontradas.

**Fluxos alternativos e exceções**
- Busca sem resultado: a tela mostra mensagem de nenhuma conta encontrada.

**Erros previstos**
- Pessoa com papel usuário tenta abrir a gestão de usuários: a resposta é "acesso negado" e nenhum dado de conta é mostrado.

**Prioridade:** media

**Critérios de aceitação**
- Admin vê todas as contas com nome, e-mail, papel e situação, no máximo 20 por página.
- Busca por parte do nome ou do e-mail mostra só as contas que contêm o termo.
- Pessoa com papel usuário recebe "acesso negado" e não vê nenhuma conta.

---

### RF-013 Alterar papel ou desativar usuário
O sistema permite ao admin promover ou rebaixar uma conta e desativar ou reativar o acesso, registrando cada mudança.

**Para quem:** admin do app de exemplo, que controla quem acessa e quem administra; dev, que tem o exemplo de permissão com trava e auditoria.

**Depende de**
- RF-012 (fluxo): o admin escolhe a conta na lista de usuários.

**Fluxo principal**
- O admin escolhe uma conta na lista.
- Escolhe promover a admin, rebaixar a usuário, desativar ou reativar.
- O sistema confere as travas.
- O sistema grava a mudança e registra quem fez, o valor anterior, o novo e o horário.
- Se a conta foi desativada, todas as sessões dela são encerradas.

**Fluxos alternativos e exceções**
- Reativar uma conta desativada devolve a situação que ela tinha antes (pendente ou ativa).

**Erros previstos**
- Admin tenta rebaixar ou desativar a própria conta: a ação é recusada com a explicação.
- Ação deixaria o sistema sem nenhum admin ativo: a ação é recusada com a explicação.
- Pessoa com papel usuário tenta a ação: a resposta é "acesso negado" e nada muda.

**Prioridade:** media

**Critérios de aceitação**
- Conta promovida passa a abrir a gestão de usuários; conta rebaixada deixa de abrir.
- Conta desativada perde as sessões abertas e não consegue entrar, mesmo com a senha certa; reativada volta a entrar.
- Rebaixar ou desativar o último admin ativo, ou a si mesmo, é recusado e nada muda.
- Toda mudança de papel ou situação fica registrada com quem fez, valor anterior, valor novo e horário.

---

## Requisitos não funcionais

Performance
- Ações comuns (entrar, criar, listar, editar e excluir tarefa, listar usuários) respondem em até 1 segundo para 95 por cento dos casos.
- E-mails transacionais chegam à caixa de entrada em até 2 minutos após a ação que os gera.

Disponibilidade
- 99.5 por cento de disponibilidade mensal como referência para o projeto gerado ajustar.

Segurança e autorização
- Toda tela e ação, exceto cadastro, confirmação, entrar e recuperação de senha, exige sessão aberta.
- Papel usuário acessa só o próprio perfil e as próprias tarefas; papel admin acessa também a gestão de usuários, mas não as tarefas de outras pessoas.
- Senha nunca é armazenada nem exibida em texto puro.
- Links de confirmação e recuperação são de uso único e expiram (24 horas e 1 hora).

Auditoria e rastreabilidade
- Toda mudança de papel ou situação de conta é rastreável até quem fez, valor anterior, valor novo e horário.

Confiabilidade e integridade de dados
- O sistema sempre tem pelo menos um admin ativo.
- Uma tarefa sempre pertence a exatamente uma conta.

Compatibilidade
- Telas utilizáveis em navegadores lançados nos últimos 2 anos, em desktop e celular.
- Interface e e-mails em português do Brasil.

Compliance
- Dados pessoais tratados conforme a LGPD: senha protegida e dados pessoais (nome, e-mail, senha) nunca aparecem em registros técnicos do sistema.

Acessibilidade
- Sem exigência formal nesta entrega, por decisão de escopo; o projeto gerado define a própria meta.

---

## Decisões de produto e trade-offs

### Decisão: confirmação de e-mail obrigatória antes de entrar
- **Justificativa:** evita contas com e-mail de outra pessoa e mostra o fluxo de link por e-mail, o mesmo da recuperação de senha.
- **Trade-off:** mais atrito no primeiro acesso e o app depende do envio de e-mail para qualquer pessoa entrar.

### Decisão: primeiro admin criado na instalação
- **Justificativa:** só admin promove admin; criar o primeiro com e-mail definido na configuração mantém o setup dentro de 15 minutos sem abrir brecha.
- **Trade-off:** quem instala precisa definir o e-mail do admin inicial antes de subir o app.

### Decisão: tarefas são privadas de quem criou
- **Justificativa:** exemplifica isolamento de dados por usuário, o caso mais comum em projetos reais.
- **Trade-off:** sem lista compartilhada nem visão de admin sobre tarefas; quem precisar disso adapta no projeto gerado.

### Decisão: acesso a tarefa alheia responde como inexistente
- **Justificativa:** não revela que a tarefa existe nem a quem pertence (hipótese)
- **Trade-off:** mensagem menos explicativa para quem errou o endereço.

### Decisão: regra de senha com mínimo de 8 caracteres, letra e número
- **Justificativa:** equilíbrio entre segurança e atrito, fácil de explicar na tela.
- **Trade-off:** aceita senhas mais fracas que regras de 12 caracteres.

### Decisão: bloqueio de 15 minutos após 5 tentativas erradas
- **Justificativa:** trava tentativa por força bruta sem exigir suporte para destravar.
- **Trade-off:** quem errou a senha 5 vezes espera 15 minutos, mesmo sendo a dona da conta.

### Decisão: recuperação com link de 1 hora e resposta neutra
- **Justificativa:** limita a janela de uso de um link vazado e não revela quais e-mails têm conta.
- **Trade-off:** a pessoa que digitou o e-mail errado não fica sabendo disso pela tela.

### Decisão: troca de senha avisa por e-mail e encerra outras sessões
- **Justificativa:** a pessoa fica sabendo de troca que não fez e quem estava com a sessão dela perde o acesso.
- **Trade-off:** quem troca a senha precisa entrar de novo nos outros aparelhos.

### Decisão: e-mail fixo depois do cadastro
- **Justificativa:** evita um segundo fluxo de confirmação nesta entrega.
- **Trade-off:** quem muda de e-mail precisa de uma conta nova.

### Decisão: exclusão de tarefa definitiva, com confirmação
- **Justificativa:** simples e suficiente para o exemplo.
- **Trade-off:** tarefa excluída por engano não volta.

### Decisão: o sistema nunca fica sem admin ativo, e mudanças de conta são registradas
- **Justificativa:** impede perder a gestão do app e permite reconstruir quem mudou o quê.
- **Trade-off:** o último admin não consegue sair do papel sem antes promover outra conta.

---

## Dependências

### DEP-1 externa: serviço de envio de e-mail
Serviço que entrega os e-mails transacionais (confirmação de conta, recuperação de senha, aviso de troca de senha). No ambiente local, os e-mails ficam visíveis numa caixa de teste, sem conta em serviço externo, para não comprometer a meta de 15 minutos; fora do ambiente local, quem instala o projeto gerado configura um serviço real. Enquanto não houver envio, ninguém confirma conta (RF-001), recupera senha (RF-005) nem recebe aviso de troca (RF-007).

---

## Riscos e mitigação

### O template envelhece e o setup de 15 minutos deixa de funcionar
- **Probabilidade:** alta
- **Impacto:** quem cria um projeto pelo template perde horas resolvendo dependências desatualizadas, anulando o objetivo principal.
- **Mitigação:**
  - Atualizações de dependências propostas automaticamente.
  - Ensaio do setup cronometrado a cada versão publicada.
- **Plano de contingência:** o README aponta a última versão que passou no ensaio, até a correção sair.

### O exemplo é copiado com uma falha de segurança
- **Probabilidade:** media
- **Impacto:** um erro no login, nas permissões ou no isolamento de tarefas se replica em todos os projetos gerados a partir do template.
- **Mitigação:**
  - Testes de permissão obrigatórios.
  - Revisão de segurança antes de cada versão.
- **Plano de contingência:** correção publicada com aviso de segurança no repositório, dizendo o que os projetos gerados precisam aplicar.

---

## Critérios de aceitação

Critérios de cada RF ficam no próprio RF. Aqui ficam só os transversais.

Integração entre requisitos
- RF-001 → RF-002: a conta criada no cadastro fica ativa ao abrir o link recebido no e-mail daquele cadastro, e só ela.
- RF-002 → RF-003: conta confirmada entra com a senha definida no cadastro; conta não confirmada não entra.
- RF-001 → RF-005: o e-mail cadastrado recebe o link de recuperação e a nova senha passa a valer para aquela conta.
- RF-008 → RF-009: tarefa criada aparece no topo da lista da dona, no filtro pendentes, com o título e a descrição informados.
- RF-008 → RF-010: tarefa criada pode ser editada e concluída pela dona, e por nenhuma outra conta.
- RF-008 → RF-011: tarefa criada pode ser excluída pela dona, e por nenhuma outra conta.

Transversais
- Alguém de fora do time cria o repositório pelo template e, seguindo só o README, tem o app rodando localmente com cadastro, confirmação, login e tarefas em até 15 minutos.
- Um dev cria uma entidade nova com tela e testes seguindo o padrão de tarefas em até 2 horas.
- Nenhuma ação de tarefa de uma conta lê ou altera tarefa de outra conta.
- Nenhuma ação de gestão de usuários é executada por conta com papel usuário.
- Nenhum registro técnico do sistema contém senha, nome ou e-mail em texto puro.
- No ambiente local, todo e-mail transacional aparece na caixa de teste em até 2 minutos.

---

## Validação

Tipos de validação obrigatórios
- Testes automatizados das regras: regra de senha, bloqueio por tentativas, validade e uso único dos links, isolamento de tarefas e travas de admin.
- Teste de ponta a ponta do fluxo principal de cada RF de prioridade alta (cadastro, confirmação, entrar, sair e CRUD de tarefas), pela tela.
- Teste de permissões: conta com papel usuário barrada na gestão de usuários e em tarefas de outras contas.
- Ensaio do setup cronometrado por alguém de fora do time.

Estratégia de validação
- Testes automatizados rodam em toda mudança; o ensaio cronometrado e a revisão de segurança rodam antes de cada versão publicada.
