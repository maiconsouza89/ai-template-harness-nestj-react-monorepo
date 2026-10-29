# Asserções: do `Então` ao teste

Frases reconhecidas nos bullets do `Então` que a skill traduz **mecanicamente** em asserção. Bullet que casa com um padrão é executado sem interpretação. Bullet que não casa é interpretado livremente, e o item ganha `*` no relatório, com a interpretação escrita.

Este arquivo é a fronteira entre a tradução confiável e a interpretação marcada. Um padrão novo entra aqui só depois de aparecer em pelo menos dois contratos reais. Na dúvida entre casar um padrão com folga e marcar `*`, marque `*`.

A forma dos bullets vem de `.claude/skills/spec-writer/references/contrato.md` seção 7: uma observação por linha, na superfície da seção.

## Sumário

1. HTTP
2. Persistência
3. Arquivos
4. Comando e processo
5. UI e base visual
6. Fila e worker
7. Transversais
8. O que nunca se traduz mecanicamente

## 1. HTTP

| Frase | Asserção |
|---|---|
| `a resposta é <N>` | status igual a N |
| `a resposta é <N> com <campo> igual a <valor>` | status N e campo do corpo igual ao valor |
| `a resposta é <N> com \`code\` \`<CODE>\`` | status N e `body.code` igual a CODE |
| `o corpo é \`<json>\`` | corpo igual ao JSON, campo a campo |
| `o corpo traz \`<a>\`, \`<b>\` e \`<c>\`` | cada campo presente; com valor ao lado (`\`code\` \`X\``, `\`statusCode\` 503`), igual ao valor |
| `o corpo traz <campo> igual a <valor>` | igualdade do campo |
| `o corpo não traz <coisa>` | ausência do campo ou do padrão (pilha de erro: linhas `at ...`, caminhos de arquivo) |
| `<campo> é uma lista com <N> <coisa>` | tipo lista e tamanho N, e o conteúdo quando dito |
| `a resposta traz o cabeçalho \`<nome>\`` / `... igual a <valor>` | cabeçalho presente, ou igual |
| `as <N> primeiras respostas são <S>` / `a <ordinal> é <S>` | status de uma sequência de requisições, por posição |
| `<campo>` com tipo entre parênteses (`(uuid)`, `(ISO 8601)`) | forma do valor |
| `<campo>` igual a `<handle>.<atributo>` | igualdade com o valor do estado persistido |

## 2. Persistência

| Frase | Asserção |
|---|---|
| `existe exatamente <N> linha(s) em <tabela>` [`com <coluna> igual a <valor>`] | `count(*)` com o filtro igual a N |
| `nenhuma linha em <tabela>` [`com ...`] / `<tabela> fica vazia` | `count(*)` igual a 0 |
| `a linha em <tabela> tem <coluna> igual a <valor>` | igualdade por coluna |
| `<coluna> fica nula` / `não fica nula` | nulidade |
| `os valores da linha batem com o corpo da resposta` | cada coluna igual ao campo de mesmo nome capturado da resposta |
| `a segunda não cria linha duplicada` | contagem igual antes e depois da repetição |
| `a extensão <X> existe no schema <s>` / `o schema <s> existe` | consulta ao catálogo do banco |

Handles se resolvem pelo estado persistido: `com dono igual a exibidor-com-tela.id`.

## 3. Arquivos

| Frase | Asserção |
|---|---|
| `<caminho> existe` | `stat` com sucesso e tamanho maior que zero |
| `<caminho> existe e descreve <coisa>` | existência e conteúdo com a coisa (chave, rota, campo) |
| `<caminho> é um <tipo> não vazio` (PNG, MP4, JSON) | existência e tipo pela assinatura do arquivo ou pela ferramenta do tipo |
| `nenhum arquivo fica em <pasta>` / `<pasta> fica vazia` | listagem vazia |
| `<caminho> tem o mesmo tamanho que <fixture>` | tamanhos iguais |
| `o documento não tem <coisa>` | ausência no conteúdo |

## 4. Comando e processo

| Frase | Asserção |
|---|---|
| `o comando termina com código 0` / `... diferente de 0` | código de saída |
| `o processo termina com código diferente de 0` | código de saída de um processo que deveria recusar subir |
| `a saída aponta <coisa>` / `a saída de erro nomeia <X>` | `stdout` ou `stderr` contém a coisa |
| `a saída não traz <coisa>` | ausência na saída |
| `nenhuma porta fica escutando` | nenhuma porta do processo aberta depois que ele termina |
| `um \`<comando>\` seguinte termina com código 0` | segundo comando, na sequência, com sucesso |
| `nenhuma migração nova é gerada` | o gerador de migração não cria arquivo |

## 5. UI e base visual

| Frase | Asserção |
|---|---|
| `a página mostra "<texto>"` / `<região> mostra "<texto>"` | texto visível, igualdade ou substring |
| `um botão "<rótulo>" aparece habilitado` | busca pelo nome acessível, sem `disabled` |
| `nenhum <elemento> aparece` | busca vazia |
| `a URL passa a <caminho>` | endereço do navegador |
| `nenhuma requisição vai para <padrão>` / `a página chama <rota>` | registro de rede durante a ação |
| `o campo <nome> mostra o erro "<texto>"` | mensagem associada ao campo |

**Base visual**, em todo item de UI e E2E, além dos bullets. Depois de cada `Quando` que muda a tela, o escopo é o que os bullets citam mais o que ficou visível pela ação (menu, popover, diálogo, dica, lista suspensa), onde quer que tenha sido montado. Superfície que abre se confere **aberta**, antes de qualquer clique dentro dela: chegar ao estado final não prova que o menu estava visível. Quando o mesmo gatilho se repete em várias linhas ou cartões, confira também uma instância da borda (a última linha visível, a mais perto de uma rolagem), onde o corte costuma aparecer. Duas passadas:

- **Mecânica** (sem `*`): imagem e vídeo carregaram de fato (requisição 2xx e dimensão natural maior que zero, ou vídeo com quadro disponível; ícone de imagem quebrada não vale, salvo bullet que declare a alternativa); cada elemento visível está dentro da janela, não é cortado pelo `overflow` de um ancestral e recebe o clique no centro (`elementFromPoint`).
- **Por screenshot** (com `*`): olhe só o escopo e registre corte, sobreposição, render quebrado ou layout desmontado que a mecânica não pegou.

Cada achado vira um bullet a mais no item, com o caminho do screenshot na evidência, e falha o item como qualquer bullet do contrato.

## 6. Fila e worker

| Frase | Asserção |
|---|---|
| `o job fica <estado>` (concluído, falho, na fila de mortos) | estado do job no armazenamento da fila |
| `o job é tentado <N> vezes` / `... até <N> retentativas` | contagem de tentativas |
| `o job vai para a fila de mortos <fila>` | presença na fila de mortos |
| `a linha de log traz <campo> igual a <valor>` | linha de log do processo como JSON, campo igual |
| `nenhuma linha de log contém <valor>` | ausência do valor em todas as linhas capturadas |

## 7. Transversais

- **Erro padrão**: `o corpo traz \`statusCode\`, \`message\`, \`error\` e \`code\` \`<CODE>\`` confere os quatro campos, com `message` não vazio e `code` igual.
- **Tempo e ordem**: datas em ISO 8601; `<a> acontece antes de <b>` compara as duas.
- **Prazo**: `em até <N> segundos` (ou minutos) consulta repetidamente até o prazo e falha se não acontecer; sem prazo, não é mecânico (seção 8).
- **Cruzamento**: resposta, banco e arquivo se comparam capturando a fonte primeiro e conferindo o destino depois.

## 8. O que nunca se traduz mecanicamente

Bullet só com isto deixa o item `manual`; misturado com bullets mecânicos, o bullet fica como não verificável e o item vira `manual` no total.

- "parece certo", "segue o design" sem seletor ou valor concreto;
- "eventualmente", "depois de um tempo" sem prazo;
- "a pessoa entende", "fica claro";
- desempenho sem limite mensurável;
- "aproximadamente" sem tolerância e sem valor de referência calculável.
