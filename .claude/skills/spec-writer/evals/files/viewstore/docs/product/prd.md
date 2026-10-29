# PRD: viewstore

Versão: 0.1.2
Data: 2026-10-23
Responsável: Maicon Souza

---

## Resumo

O viewstore conecta donos de estabelecimentos comerciais com TVs ociosas a anunciantes que querem divulgar sua marca a um custo menor que o outdoor. O exibidor usa a TV de forma privada, com seus próprios criativos, ou a torna pública e recebe pelos anúncios exibidos nela. A plataforma ganha com assinaturas de exibidores que querem uso privado sem o brand do freemium, com 30 por cento de comissão sobre anúncios diretos e com pacotes de rede veiculados em todas as telas públicas. A primeira entrega mira uma região de algumas cidades, com 70 estabelecimentos e 100 telas em 6 meses.

---

## Contexto e problema

Público-alvo
- Exibidor: dono de estabelecimento comercial com uma ou mais TVs que hoje ficam desligadas ou passando YouTube; quer divulgar a própria marca e ganhar com o espaço ocioso.
- Anunciante: marca ou comércio local que quer exposição física recorrente sem o preço do outdoor; contrata telas específicas ou pacotes de rede.
- Operador viewstore: time interno que modera criativos, trata conflito entre concorrentes, configura planos e parâmetros comerciais e acompanha as metas.

Cenários de uso chave
- Exibidor cadastra o estabelecimento e uma TV privada no freemium e passa o próprio cardápio e promoções, com a marca d'água da plataforma.
- Exibidor torna uma TV pública, define o ciclo de espaços e o preço por semana, e passa a receber pelos anúncios vendidos.
- Anunciante encontra telas públicas no mapa, contrata espaços por semanas em telas escolhidas e acompanha a comprovação de exibição.
- Anunciante contrata um pacote de rede mensal com renovação automática e aparece em todas as telas públicas.
- Operador aprova criativos de anunciantes, retira telas conflitantes de uma campanha e acompanha ocupação e receita.

Contexto de implantação
- Sistema novo, a partir de uma ideia, sem exibidores nem anunciantes na base. Não substitui nem se integra a sistema existente. Agências ficam para uma fase futura.

Problemas priorizados
- TVs de estabelecimentos ficam ociosas ou passando conteúdo de terceiros, sem gerar receita nem divulgar a marca do dono. Impacto: algumas centenas de reais por tela por mês deixados na mesa (hipótese). Prioridade: alta
- Anunciante local não tem mídia física acessível; outdoor é caro e de compra pouco prática. Impacto: anunciantes de pequeno porte ficam fora da mídia física. Prioridade: alta
- Exibidor que quer só divulgar a própria marca não tem ferramenta simples para programar a TV. Impacto: concorrente regional ocupa esse espaço publicando stories do Instagram. Prioridade: media

---

## Objetivos e métricas

| Objetivo | Métrica | Meta |
| --- | --- | --- |
| Formar a rede | Estabelecimentos e telas ativas | 70 estabelecimentos e 100 telas (40 públicas, 60 privadas) em 6 meses |
| Monetizar o uso privado | Percentual de exibidores privados em plano pago | 20 por cento em 6 meses (hipótese) |
| Vender as telas públicas | Percentual de espaços das telas públicas vendidos | 50 por cento no 6º mês (hipótese) |
| Gerar receita ao exibidor | Média repassada por tela pública por mês | R$ 300 no 6º mês (hipótese) |
| Reter o anunciante | Percentual de anunciantes que compram de novo em até 90 dias | 40 por cento (hipótese) |

---

## Escopo

Incluso
- Conta única que pode ter papel de exibidor, de anunciante ou os dois.
- Cadastro de estabelecimento com localização e de telas com modo (pública ou privada) e orientação (paisagem ou retrato).
- Criativos enviados com a orientação escolhida e exibidos só em telas compatíveis.
- Programação da tela privada com criativos próprios; brand da plataforma no freemium.
- Planos de assinatura configuráveis pelo operador (telas, criativos, armazenamento, frequência de brand, periodicidade).
- Preço e ciclo da tela pública definidos pelo exibidor, respeitando piso e mínimo de espaços de rede.
- Mapa aberto de telas públicas.
- Contratação de anúncio direto e de pacote de rede, com pagamento e crédito na plataforma.
- Moderação de criativos de anunciantes e de conflitos entre concorrentes.
- Reprodução na TV com registro de cada exibição, inclusive sem internet.
- Comprovação de exibição, painéis de anunciante, exibidor e operador.
- Repasse mensal ao exibidor com saque sob pedido.

Fora de escopo
- Agências operando vários anunciantes (fase futura).
- Importar stories do Instagram para a tela (fase futura).
- Agendamento de criativos por horário (fase futura).
- Medição de audiência por câmera ou sensor.
- Venda programática ou por leilão.
- Aplicativo de celular nas lojas; o painel é usado no navegador.
- Moderação de criativos do exibidor na própria tela privada (responsabilidade do exibidor pelos termos de uso).

---

## Requisitos funcionais

### RF-001 Criar conta de exibidor ou anunciante
O sistema permite criar uma conta com papel de exibidor, de anunciante ou ambos, e cadastrar estabelecimentos com localização.

**Para quem:** exibidor e anunciante, que entram na plataforma com uma conta só.

**Depende de**
- DEP-2 (fluxo): localizar o endereço no mapa para o exibidor confirmar o ponto.

**Fluxo principal**
- A pessoa informa nome, CPF ou CNPJ e contato e aceita os termos de uso.
- Escolhe o papel: exibidor, anunciante ou os dois.
- Se exibidor, cadastra o estabelecimento com nome, ramo e endereço.
- O sistema localiza o endereço no mapa e o exibidor confirma o ponto.
- A conta fica ativa; o exibidor começa no plano freemium.

**Fluxos alternativos e exceções**
- Exibidor cadastra mais de um estabelecimento na mesma conta.
- Conta existente acrescenta o outro papel a qualquer momento.
- Dados para recebimento são opcionais no cadastro e passam a ser exigidos para ter tela pública.
- Endereço em qualquer cidade é aceito; não há restrição de região.

**Erros previstos**
- Documento já cadastrado: o sistema não cria outra conta e oferece entrar e acrescentar o papel na conta existente.
- Endereço não localizado no mapa: o exibidor posiciona o ponto manualmente antes de concluir.

**Prioridade:** alta

**Critérios de aceitação**
- Exibidor conclui o cadastro e o estabelecimento aparece na posição confirmada.
- Uma mesma conta consegue atuar como exibidor e anunciante sem novo cadastro.
- Documento repetido não gera segunda conta.

---

### RF-002 Cadastrar tela
O sistema permite ao exibidor cadastrar telas no estabelecimento, com modo e orientação, e vincular a TV física à tela cadastrada.

**Para quem:** exibidor, que coloca a TV em funcionamento na plataforma.

**Depende de**
- RF-001 (dado): estabelecimento e dados para recebimento do exibidor.

**Fluxo principal**
- Exibidor cria a tela no estabelecimento com nome, orientação (paisagem ou retrato) e modo (pública ou privada).
- A TV mostra um código de vínculo.
- Exibidor digita o código no painel.
- A tela passa a constar como online.

**Fluxos alternativos e exceções**
- Exibidor altera modo ou orientação de uma tela existente.
- Tela pública com campanha vendida só muda para privada após o fim da última campanha.

**Erros previstos**
- Código inválido ou expirado: vínculo recusado e opção de gerar novo código.
- Tela pública sem dados para recebimento: criação bloqueada com aviso para completá-los.
- Troca para privada com campanha vigente: bloqueada, mostrando a data da última campanha.

**Prioridade:** alta

**Critérios de aceitação**
- Tela vinculada aparece online em até 1 minuto (hipótese).
- Código expirado não vincula a TV.
- Troca de pública para privada é recusada enquanto houver campanha vendida.

---

### RF-003 Enviar criativo
O sistema permite a exibidor e anunciante enviar criativos (imagem ou vídeo) escolhendo a orientação de cada arquivo.

**Para quem:** exibidor e anunciante, que preparam o que vai passar nas telas.

**Depende de**
- RF-001 (dado): conta e papel do autor do criativo.

**Fluxo principal**
- Autor envia o arquivo e escolhe a orientação: paisagem ou retrato.
- Opcionalmente envia a versão da outra orientação no mesmo criativo.
- Define a duração de exibição.
- Criativo do exibidor fica disponível na hora; criativo de anunciante fica como aguardando moderação.

**Fluxos alternativos e exceções**
- Autor acrescenta depois a versão que faltava; criativo de anunciante volta para moderação.

**Erros previstos**
- Proporção do arquivo diferente da orientação escolhida: envio recusado com o motivo.
- Formato não aceito ou duração fora do limite: envio recusado com o motivo.
- Limite de criativos ou armazenamento do plano do exibidor atingido: envio bloqueado com opção de trocar de plano.

**Prioridade:** alta

**Critérios de aceitação**
- Criativo enviado registra a orientação escolhida e só é oferecido para telas dessa orientação.
- Arquivo com proporção errada é recusado com mensagem do motivo.
- Exibidor no limite do plano não consegue enviar novo criativo.

---

### RF-004 Moderar criativos de anunciantes
O operador aprova ou recusa criativos de anunciantes e define o ramo do anunciante para tratar conflito de concorrência.

**Para quem:** operador, que garante a qualidade e a legalidade do que vai ao ar; e anunciante, que sabe o resultado.

**Depende de**
- RF-003 (dado): criativos de anunciante aguardando moderação.

**Fluxo principal**
- Operador abre a fila de criativos pendentes, mais antigos primeiro.
- Vê o criativo, o anunciante e o ramo declarado.
- Aprova, ou recusa informando o motivo.
- Anunciante é notificado do resultado.

**Fluxos alternativos e exceções**
- Operador corrige o ramo do anunciante antes de aprovar.

**Erros previstos**
- Criativo recusado de campanha já paga: valor estornado integralmente como crédito na plataforma.

**Prioridade:** alta

**Critérios de aceitação**
- Criativo é respondido em até 24 horas úteis após o envio.
- Criativo recusado nunca chega a nenhuma tela e mostra o motivo ao anunciante.
- Recusa de criativo de campanha paga gera crédito igual ao valor pago.

---

### RF-005 Programar tela privada
O sistema permite ao exibidor montar a programação das telas privadas com os próprios criativos.

**Para quem:** exibidor, que divulga a própria marca, cardápio e promoções.

**Depende de**
- RF-003 (dado): criativos do exibidor com orientação.
- RF-012 (fluxo): a programação publicada só aparece na TV pela reprodução da tela.

**Fluxo principal**
- Exibidor escolhe criativos próprios compatíveis com a orientação da tela.
- Define ordem e duração de cada um.
- Publica em uma ou mais telas privadas.
- As telas passam a exibir a nova programação.

**Fluxos alternativos e exceções**
- Mesma programação publicada em várias telas de mesma orientação.

**Erros previstos**
- Criativo de orientação diferente da tela: não pode ser adicionado.
- Tela pausada por limite de plano: publicação bloqueada com aviso.

**Prioridade:** alta

**Critérios de aceitação**
- Programação publicada aparece na TV em até 5 minutos.
- Criativo retrato não entra em programação de tela paisagem.

---

### RF-006 Aplicar brand do freemium
O sistema exibe marca d'água e criativos globais da plataforma nas telas privadas de exibidores no freemium.

**Para quem:** operador, que divulga a plataforma; e exibidor, que entende o que ganha ao assinar.

**Depende de**
- RF-005 (fluxo): a brand entra sobre a programação da tela privada.
- RF-007 (dado): plano vigente do exibidor, que diz se a tela tem brand e com que frequência.

**Fluxo principal**
- Operador publica criativos globais nas duas orientações.
- Tela privada de exibidor no freemium exibe a marca d'água durante toda a programação.
- A cada 5 criativos do exibidor entra 1 criativo global, conforme a frequência do plano.
- Ao assinar plano pago, marca d'água e criativos globais saem na próxima atualização da tela.

**Fluxos alternativos e exceções**
- Sem criativo global na orientação da tela, a tela segue só com a marca d'água.

**Erros previstos**
- Retorno ao freemium por inadimplência: brand volta na próxima atualização da tela.

**Prioridade:** alta

**Critérios de aceitação**
- Tela privada no freemium nunca exibe sem marca d'água.
- Tela de plano pago nunca exibe criativo global nem marca d'água.
- A proporção de criativos globais segue a frequência configurada no plano.

---

### RF-007 Assinar plano pago
O sistema permite ao exibidor assinar, trocar ou cancelar um plano pago, aplicando os limites do plano.

**Para quem:** exibidor, que remove o brand e ganha mais telas e criativos.

**Depende de**
- RF-002 (dado): telas públicas ativas do exibidor, que somam telas privadas ao limite.
- RF-017 (dado): planos com limites, preço e periodicidade.
- DEP-1 (fluxo): cobrança recorrente da assinatura.

**Fluxo principal**
- Exibidor compara os planos ativos.
- Escolhe um plano e paga a primeira cobrança.
- Os limites do plano passam a valer imediatamente.
- O limite de telas privadas é o do plano mais 1 por tela pública ativa.
- A cobrança se renova na periodicidade do plano.

**Fluxos alternativos e exceções**
- Rebaixar plano: exibidor escolhe quais telas acima do novo limite ficam pausadas.
- Cancelamento: plano vale até o fim do período pago e depois volta ao freemium.

**Erros previstos**
- Pagamento recusado na renovação: 7 dias de tolerância com aviso; depois volta ao freemium e telas excedentes ficam pausadas.
- Tentativa de criar tela acima do limite: bloqueada com opção de trocar de plano.

**Prioridade:** alta

**Critérios de aceitação**
- Com o pagamento aprovado, o novo limite de telas vale na hora.
- Exibidor com 1 tela pública ativa no plano de 3 telas privadas pode ter 4 telas privadas.
- Após 7 dias de inadimplência a conta volta ao freemium sem perder criativos.

---

### RF-008 Definir preço e ciclo da tela pública
O sistema permite ao exibidor definir o ciclo de espaços e o preço por espaço por semana de cada tela pública.

**Para quem:** exibidor, que controla quanto cobra e quanto espaço vende.

**Depende de**
- RF-002 (dado): tela pública com orientação e estabelecimento.
- RF-017 (regra): piso de preço por espaço e mínimo de espaços de rede definidos nos parâmetros comerciais.

**Fluxo principal**
- Exibidor define quantos espaços o ciclo da tela tem e a duração de cada espaço.
- O sistema reserva para pacotes de rede o mínimo de espaços definido pela plataforma.
- Exibidor informa o preço por espaço por semana.
- O sistema compara com o piso e coloca a tela à venda.

**Fluxos alternativos e exceções**
- Alteração de preço ou ciclo vale só para semanas ainda não vendidas.

**Erros previstos**
- Preço abaixo do piso: recusado, mostrando o piso.
- Ciclo com menos espaços de rede que o mínimo: recusado, mostrando o mínimo.

**Prioridade:** alta

**Critérios de aceitação**
- Nenhuma tela é posta à venda abaixo do piso.
- Mudança de preço não altera o valor de campanhas já vendidas.
- Todo ciclo de tela pública mantém o mínimo de espaços reservados para rede.

---

### RF-009 Localizar telas públicas no mapa
O sistema mostra num mapa aberto as telas públicas com orientação, preço e disponibilidade.

**Para quem:** anunciante, que descobre onde anunciar antes mesmo de criar conta.

**Depende de**
- RF-008 (dado): telas públicas com preço, ciclo e espaços livres por semana.

**Fluxo principal**
- Visitante abre o mapa sem precisar entrar na conta.
- Filtra por cidade, ramo do estabelecimento, orientação e faixa de preço.
- Vê em cada tela o estabelecimento, o preço por espaço e as semanas com espaço livre.
- Ao escolher contratar, entra na conta e segue para a contratação.

**Fluxos alternativos e exceções**
- Anunciante também pode escolher telas por lista, sem o mapa.

**Prioridade:** media

**Critérios de aceitação**
- Tela pública à venda aparece no mapa na localização do estabelecimento.
- Tela privada nunca aparece no mapa.
- Visitante sem conta vê preço e disponibilidade, mas não conclui contratação.

---

### RF-010 Contratar anúncio direto
O sistema permite ao anunciante contratar espaços por semanas em telas públicas escolhidas, pagando na plataforma.

**Para quem:** anunciante, que escolhe exatamente onde aparecer; e exibidor, que vende o espaço.

**Depende de**
- RF-004 (fluxo): a campanha só entra na programação depois que a moderação aprova o criativo.
- RF-008 (dado): preço por espaço e espaços livres de cada tela por semana.
- DEP-1 (fluxo): pagamento do anúncio pelo anunciante.

**Fluxo principal**
- Anunciante escolhe telas compatíveis com a orientação do criativo.
- Escolhe as semanas e quantos espaços por tela.
- Escolhe o criativo e paga com meio de pagamento ou crédito da plataforma.
- A moderação aprova o criativo e trata conflito de concorrência.
- A campanha entra na programação das telas a partir da aprovação.

**Fluxos alternativos e exceções**
- Aprovação após o início da semana: dias perdidos viram crédito proporcional.
- Tela de exibidor do mesmo ramo do anunciante: operador retira a tela e o valor dela vira crédito.
- Anunciante pede resgate do crédito em dinheiro.

**Erros previstos**
- Espaço esgotado entre a escolha e o pagamento: tela retirada do carrinho com aviso.
- Pagamento recusado: campanha não é criada e os espaços são liberados.
- Criativo sem a orientação da tela: tela não pode ser escolhida.

**Prioridade:** alta

**Critérios de aceitação**
- Campanha aprovada passa a constar na programação das telas contratadas na semana contratada.
- Nenhum espaço é vendido duas vezes na mesma semana.
- Tela retirada por conflito gera crédito igual ao valor daquela tela.
- Crédito pode ser usado em nova compra ou resgatado em dinheiro.

---

### RF-011 Contratar pacote de rede
O sistema permite ao anunciante contratar um pacote semanal, quinzenal ou mensal veiculado nos espaços de rede de todas as telas públicas.

**Para quem:** anunciante, que alcança a rede toda numa compra só; e operador, que vende a rede.

**Depende de**
- RF-004 (fluxo): o pacote só vai ao ar depois que a moderação aprova o criativo.
- RF-008 (dado): espaços reservados para rede em cada tela pública.
- DEP-1 (fluxo): pagamento do pacote pelo anunciante.

**Fluxo principal**
- Operador configura os pacotes com duração, preço e descontos progressivos.
- Anunciante escolhe duração e data de início e vê o preço com desconto.
- Opcionalmente ativa renovação automática e recebe o desconto de recorrência.
- Paga com meio de pagamento ou crédito; a moderação aprova o criativo.
- O criativo entra nos espaços de rede de todas as telas públicas, cada uma na sua orientação.

**Fluxos alternativos e exceções**
- Período sem espaço de rede livre: aparece como esgotado e o sistema oferece a primeira data livre.
- Renovação automática cobra o próximo período antes do fim do atual.

**Erros previstos**
- Criativo sem as duas orientações: contratação bloqueada até o anunciante enviar a versão que falta, porque o pacote cobre a rede toda (hipótese).
- Pagamento da renovação recusado: pacote encerra no fim do período atual com aviso.
- Pagamento inicial recusado: pacote não é criado e espaços são liberados.

**Prioridade:** alta

**Critérios de aceitação**
- Pacote ativo aparece nos espaços de rede de toda tela pública, nas duas orientações.
- Preço mensal com renovação é menor que o mensal sem renovação, que é menor que 4 semanais.
- Período lotado não pode ser contratado e mostra a próxima data livre.

---

### RF-012 Reproduzir programação e registrar exibições
A TV vinculada reproduz a programação da tela na orientação cadastrada e registra cada exibição.

**Para quem:** exibidor e anunciante, que têm o conteúdo no ar e a exibição comprovada.

**Depende de**
- RF-002 (dado): tela vinculada, modo e orientação.

**Fluxo principal**
- A TV baixa a programação da tela e os criativos na orientação cadastrada.
- Em tela pública, reproduz o ciclo: espaços vendidos, espaços de rede e espaços livres alternando criativos do exibidor e globais.
- Em tela privada, reproduz a programação do exibidor com brand quando houver.
- Registra cada exibição com tela, criativo, data e horário.
- Envia os registros e verifica atualização de programação periodicamente.

**Fluxos alternativos e exceções**
- Sem internet: segue a última programação por até 72 horas e envia os registros ao reconectar.
- Tela fora do ar: exibições não entregues viram crédito proporcional ao anunciante e não entram no repasse.

**Erros previstos**
- Registro que não chega: exibição não conta para comprovação nem repasse.

**Prioridade:** alta

**Critérios de aceitação**
- A TV nunca exibe criativo de orientação diferente da cadastrada.
- Sem internet, a TV continua exibindo e os registros chegam após reconectar.
- Exibições contratadas e não entregues por tela fora do ar geram crédito proporcional.

---

### RF-013 Painel do anunciante com comprovação
O sistema mostra ao anunciante suas campanhas e a comprovação de exibição por tela, dia e horário.

**Para quem:** anunciante, que confere o que recebeu e decide comprar de novo.

**Depende de**
- RF-010 (dado): campanhas de anúncio direto contratadas.
- RF-011 (dado): pacotes de rede contratados.
- RF-012 (dado): registros de exibição.

**Fluxo principal**
- Anunciante abre o painel e vê campanhas e pacotes ativos e encerrados.
- Escolhe uma campanha e vê exibições por tela e por dia.
- Vê exibições contratadas, entregues e convertidas em crédito.
- Exporta o relatório de comprovação.

**Fluxos alternativos e exceções**
- Campanha em moderação aparece como aguardando, sem exibições.

**Prioridade:** media

**Critérios de aceitação**
- Total de exibições do painel bate com os registros recebidos das TVs.
- Relatório exportado lista tela, data, horário e criativo de cada exibição.

---

### RF-014 Repassar valores ao exibidor
O sistema fecha mensalmente o saldo de cada exibidor, com 70 por cento do valor vendido, e permite o saque sob pedido.

**Para quem:** exibidor, que recebe pelo uso da tela; e operador, que retém a comissão da plataforma.

**Depende de**
- RF-010 (dado): valores de anúncio direto por tela.
- RF-011 (dado): valores de pacotes de rede.
- RF-012 (dado): exibições registradas por tela.

**Fluxo principal**
- No fim do mês, o sistema soma o anúncio direto entregue em cada tela.
- Divide o valor dos pacotes de rede entre as telas proporcionalmente às exibições registradas.
- Retém 30 por cento e credita 70 por cento no saldo do exibidor.
- Exibidor vê o extrato e solicita o saque.
- O valor é transferido para os dados de recebimento do exibidor.

**Fluxos alternativos e exceções**
- Exibições não entregues por tela fora do ar não entram no saldo.

**Erros previstos**
- Dados de recebimento inválidos: saque não é feito e o saldo volta disponível com aviso.
- Saque acima do saldo: recusado.

**Prioridade:** alta

**Critérios de aceitação**
- Soma dos repasses de um mês mais a comissão retida é igual ao valor entregue no mês.
- Valor de pacote de rede é dividido proporcionalmente às exibições de cada tela.
- Saldo do exibidor nunca fica negativo.

---

### RF-015 Painel do exibidor
O sistema mostra ao exibidor exibições, ocupação dos espaços, ganhos e saldo disponível.

**Para quem:** exibidor, que acompanha quanto a tela rende e decide abrir mais telas públicas.

**Depende de**
- RF-014 (dado): saldo, extrato mensal e saques.

**Fluxo principal**
- Exibidor abre o painel e escolhe o período.
- Vê exibições e ocupação dos espaços por tela pública.
- Vê ganhos por mês e saldo disponível para saque.

**Fluxos alternativos e exceções**
- Exibidor só com telas privadas vê exibições, sem ganhos nem ocupação.

**Prioridade:** media

**Critérios de aceitação**
- Ganho do mês no painel bate com o extrato do repasse.
- Ocupação mostrada é a razão entre espaços vendidos e espaços à venda.

---

### RF-016 Painel do operador (hipótese)
O sistema mostra ao operador os indicadores das metas do produto e a receita por linha.

**Para quem:** operador, que acompanha as metas e age sobre telas offline.

**Depende de**
- RF-007 (dado): assinaturas por plano.
- RF-014 (dado): receita retida e repassada por mês.

**Fluxo principal**
- Operador abre o painel.
- Vê estabelecimentos e telas ativas, percentual em plano pago, ocupação das telas públicas, média repassada por tela e recompra de anunciantes.
- Vê receita por linha: planos, anúncio direto e pacotes de rede.
- Vê lista de telas offline há mais de 24 horas.

**Fluxos alternativos e exceções**
- Operador filtra os indicadores por cidade.

**Prioridade:** media

**Critérios de aceitação**
- Cada uma das cinco metas da seção de objetivos tem um indicador no painel.
- Receita por linha soma o total retido pela plataforma no mês.

---

### RF-017 Configurar planos e parâmetros comerciais
O operador cadastra os planos de assinatura e os parâmetros comerciais da rede.

**Para quem:** operador, que ajusta oferta e preço sem mudar o produto.

**Fluxo principal**
- Operador cria ou edita um plano com nome, preço, periodicidade, limite de telas privadas, limite de criativos e armazenamento.
- Define se o plano tem brand e a frequência de criativos globais.
- Define o piso de preço por espaço e o mínimo de espaços de rede por tela pública.
- Ativa ou desativa planos para novas assinaturas.

**Fluxos alternativos e exceções**
- Alteração em plano com assinantes vale para eles só na próxima renovação, com aviso antes.

**Erros previstos**
- Plano sem limite de telas ou sem preço: não pode ser ativado.
- Desativar o único plano gratuito: bloqueado.

**Prioridade:** alta

**Critérios de aceitação**
- Existem ao menos 3 planos ativos configurados pelo operador, um deles o freemium.
- Alteração de preço não muda a cobrança de assinantes antes da renovação.
- Novo piso não afeta campanhas já vendidas.

---

## Requisitos não funcionais

Performance
- Ações comuns do painel e do mapa respondem em até 1 segundo para 95 por cento dos casos (hipótese).
- Programação publicada aparece na TV em até 5 minutos.

Disponibilidade
- Painel, mapa e contratação com 99,5 por cento de disponibilidade mensal.
- TVs seguem exibindo a última programação por até 72 horas com a plataforma fora do ar.

Segurança e autorização
- Permissão por papel: exibidor gerencia só os próprios estabelecimentos, telas e criativos; anunciante só as próprias campanhas; operador modera e configura.
- Alterações de preço, plano, piso e dados de recebimento registradas com autor, valor anterior e horário (hipótese).

Auditoria e rastreabilidade
- Toda movimentação de dinheiro (pagamento, crédito, estorno, comissão, repasse, saque) é rastreável até a campanha, a tela e a conta.

Confiabilidade e integridade de dados
- Saldo do exibidor e crédito do anunciante nunca ficam negativos.
- Venda de espaço e cobrança acontecem juntas ou não acontecem.
- Repasse mais comissão sempre somam o valor entregue.

Compatibilidade
- TV: Smart TVs dos sistemas mais comuns no Brasil e TV comum com aparelho externo na entrada HDMI.
- Painel: navegadores dos últimos 2 anos em desktop e celular; português do Brasil.

Compliance
- Dados pessoais tratados conforme a LGPD.
- Obrigações fiscais sobre assinaturas, comissão e repasse a definir com contador (lacuna).

Acessibilidade
- Fluxos principais do painel operáveis por teclado e leitor de tela (hipótese).

---

## Decisões de produto e trade-offs

### Decisão: cada tela é pública ou privada, nunca as duas
- **Justificativa:** simplifica o ciclo, a precificação e a comprovação.
- **Trade-off:** exibidor com uma única TV precisa escolher entre divulgar a própria marca e vender espaço, salvo os espaços livres da tela pública.

### Decisão: comissão de 30 por cento para a plataforma em anúncio direto e pacote de rede
- **Justificativa:** regra única e fácil de explicar ao exibidor.
- **Trade-off:** a plataforma não ganha mais pelo esforço de vender pacotes de rede.

### Decisão: exibidor define o preço da tela acima de um piso da plataforma
- **Justificativa:** quem conhece o público do estabelecimento precifica; o piso protege a rede de guerra de preço.
- **Trade-off:** preços heterogêneos dificultam comparar telas e prever receita.

### Decisão: venda automática após moderação, sem aceite do exibidor
- **Justificativa:** compra rápida para o anunciante; conflito de concorrência fica com a moderação.
- **Trade-off:** exibidor não escolhe quem anuncia na sua tela.

### Decisão: espaços reservados para pacotes de rede em toda tela pública
- **Justificativa:** garante capacidade para vender a rede inteira.
- **Trade-off:** exibidor não recusa pacote individual e tem menos espaço para anúncio direto.

### Decisão: estorno vira crédito na plataforma, resgatável em dinheiro
- **Justificativa:** incentiva nova compra sem prender o dinheiro do anunciante.
- **Trade-off:** plataforma precisa operar resgates e manter saldo para eles.

### Decisão: planos configuráveis pelo operador, com 1 tela privada extra por tela pública ativa
- **Justificativa:** permite testar preço e limites sem mudar o produto e incentiva abrir telas públicas.
- **Trade-off:** mais regras de limite para explicar e testar.

### Decisão: repasse mensal com saque sob pedido
- **Justificativa:** fechamento único por mês e exibidor decide quando receber.
- **Trade-off:** exibidor espera até o fechamento para ver o dinheiro disponível.

---

## Dependências

### DEP-1 externa: serviço de pagamento
Fornecedor que cobre cobrança de anunciantes, assinatura recorrente de exibidores e transferência de saques. Trava RF-007, RF-010, RF-011 e RF-014 enquanto não estiver contratado.

### DEP-2 externa: serviço de mapas e localização
Fornecedor que converte endereço em localização e desenha o mapa. Trava RF-001, que confirma o ponto do estabelecimento, e por consequência o mapa de RF-009.

### DEP-3 organizacional: contador e jurídico
Contador define nota fiscal e tributação de assinaturas, comissão e repasse; jurídico redige termos de uso, contrato com exibidor e política de conteúdo usada na moderação. Trava o lançamento do piloto, não a construção.

---

## Riscos e mitigação

### Sem anunciantes o exibidor não abre tela pública, e sem telas o anunciante não compra
- **Probabilidade:** alta
- **Impacto:** telas públicas vazias, repasse baixo e exibidores voltando ao uso privado.
- **Mitigação:**
  - Começar pela tela privada gratuita para formar a base de estabelecimentos.
  - Vender pacotes de rede com time comercial na região antes de abrir a venda direta.
- **Plano de contingência:** preencher espaços livres com criativos globais e oferecer crédito inicial a anunciantes do piloto.

### Exibidor desliga a TV ou troca de entrada e o anúncio não é entregue
- **Probabilidade:** media
- **Impacto:** anunciante recebe menos exibições, mais créditos e menor recompra.
- **Mitigação:**
  - Exibições não entregues ficam fora do repasse, o que alinha o incentivo do exibidor.
  - Operador acompanha telas offline há mais de 24 horas no painel.
- **Plano de contingência:** avisar o exibidor e suspender a venda de telas com queda recorrente.

### Concorrente com integração ao Instagram ganha a região primeiro
- **Probabilidade:** media
- **Impacto:** exibidores privados preferem o concorrente e a base demora a formar.
- **Mitigação:**
  - Destacar a receita da tela pública, que o concorrente não oferece.
  - Manter a importação de stories como próxima fase.
- **Plano de contingência:** antecipar a importação de stories para a primeira revisão do PRD.

### Obrigações fiscais do repasse e da comissão mais complexas que o previsto
- **Probabilidade:** media
- **Impacto:** lançamento atrasado ou custo tributário que reduz a margem dos 30 por cento.
- **Mitigação:**
  - Validar o modelo com contador antes do piloto.
- **Plano de contingência:** rodar o piloto só com uso privado e pacotes de rede até o repasse estar resolvido.

### Criativo impróprio ou de concorrente vai ao ar
- **Probabilidade:** baixa
- **Impacto:** perda de confiança do exibidor e risco legal.
- **Mitigação:**
  - Moderação obrigatória de todo criativo de anunciante.
  - Ramo do anunciante verificado pelo operador.
- **Plano de contingência:** retirar o criativo da rede, estornar como crédito e registrar o caso.

---

## Critérios de aceitação

Critérios de cada RF ficam no próprio RF. Aqui ficam só os transversais.

Integração entre requisitos
- RF-001 → RF-002: tela criada fica no estabelecimento escolhido e tela pública só é criada com dados para recebimento do cadastro.
- RF-001 → RF-003: criativo enviado fica ligado à conta e ao papel de quem enviou.
- RF-003 → RF-004: criativo de anunciante enviado aparece na fila de moderação com as orientações enviadas.
- RF-003 → RF-005: criativo do exibidor aparece para programação só nas telas da mesma orientação.
- RF-002 → RF-012: TV vinculada reproduz na orientação e no modo cadastrados na tela.
- RF-002 → RF-007: tela pública ativada aumenta em 1 o limite de telas privadas do exibidor.
- RF-007 → RF-006: exibidor que assina plano sem brand deixa de ter marca d'água e criativos globais na próxima atualização da tela, e quem volta ao freemium passa a tê-los.
- RF-017 → RF-007: plano editado pelo operador aparece para assinatura com os limites e o preço configurados.
- RF-002 → RF-008: só telas em modo público aceitam preço e ciclo.
- RF-008 → RF-009: preço e semanas livres no mapa são os mesmos definidos na tela.
- RF-008 → RF-010: espaço vendido em anúncio direto sai da disponibilidade da tela na semana.
- RF-008 → RF-011: pacote de rede ocupa só os espaços reservados para rede de cada tela.
- RF-010 → RF-013: campanha contratada aparece no painel com as telas e semanas compradas.
- RF-011 → RF-013: pacote contratado aparece no painel com duração e telas alcançadas.
- RF-012 → RF-013: cada exibição registrada pela TV aparece na comprovação do anunciante.
- RF-010 → RF-014: valor de anúncio direto entregue numa tela entra no saldo daquele exibidor com 70 por cento.
- RF-011 → RF-014: valor de pacote de rede é dividido entre exibidores conforme as exibições.
- RF-012 → RF-014: exibição não registrada não entra no repasse.
- RF-014 → RF-015: saldo e ganhos do painel do exibidor batem com o extrato do repasse.
- RF-007 → RF-016: percentual de exibidores em plano pago no painel bate com as assinaturas ativas.
- RF-014 → RF-016: receita retida no painel do operador bate com a comissão do fechamento mensal.

Transversais
- Nenhuma TV exibe criativo de anunciante sem aprovação da moderação.
- Nenhuma TV exibe criativo de orientação diferente da cadastrada na tela.
- Toda movimentação de dinheiro pode ser reconstruída até a campanha, a tela e a conta envolvidas.
- Alterações de preço, plano, piso e dados de recebimento mostram autor, valor anterior e horário.
- Com a plataforma fora do ar, uma TV com programação baixada segue exibindo.

---

## Validação

Tipos de validação obrigatórios
- Testes automatizados das regras de dinheiro: comissão de 30 por cento, divisão proporcional da rede, créditos, estornos, saldo e saque.
- Testes automatizados de limites de plano, piso de preço e mínimo de espaços de rede.
- Teste de ponta a ponta do fluxo principal de cada RF de prioridade alta.
- Teste da TV sem internet por 72 horas com envio posterior dos registros.
- Teste de permissões por papel.

Estratégia de validação
- Piloto de 4 semanas com cerca de 10 estabelecimentos e alguns anunciantes conhecidos, com roteiro de aceitação, antes de abrir a região.
