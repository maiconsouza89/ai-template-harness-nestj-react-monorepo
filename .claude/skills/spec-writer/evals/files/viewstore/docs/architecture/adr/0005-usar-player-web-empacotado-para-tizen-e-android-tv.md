---
status: accepted
date: 2026-10-24
title: "Usar player web empacotado para Tizen e Android TV, com box Android nas demais TVs"
description: "Por que um player web em TypeScript empacotado para Tizen e Android TV, com box Android na HDMI para webOS e TV comum, em vez de app por plataforma ou box em todas: reaproveita o código do painel, e o webOS de TV comum não deixa app web baixar arquivo."
supersedes:
superseded-by:
---

# 0005. Usar player web empacotado para Tizen e Android TV, com box Android nas demais TVs

## Contexto e problema

O player baixa manifesto e vídeos, guarda o suficiente para 72 horas sem internet, grava cada exibição localmente e reenvia ao reconectar (RF-012). O PRD pede Smart TVs dos sistemas mais comuns no Brasil e TV comum com aparelho na HDMI. O painel é React com TypeScript (ADR-0004), e o time não tem experiência com app nativo de TV. A documentação da LG diz que app web de webOS TV não pode baixar arquivo para o aparelho, e é isso que o cache offline exige.

## Opções consideradas

- **Web empacotado para Tizen e Android TV, box Android para o resto**: um código TypeScript, `.wgt` no Tizen com a API de download e o sistema de arquivos do app, e no Android TV uma casca com WebView, download nativo e ExoPlayer; TV LG e TV comum recebem o box Android.
- **Web empacotado também no webOS**: cobre as TVs LG sem aparelho, mas o webOS de consumo não deixa o app web baixar arquivo, e o banco local tem 10 MB divididos entre todos os apps, então 72 horas de vídeo não cabem.
- **Box Android em todas as TVs**: uma plataforma só para testar, mas cada tela custa um aparelho e uma instalação, inclusive nas Smart TVs que rodariam o app.
- **App nativo por plataforma**: acesso total ao armazenamento, mas três bases de código numa linguagem que o time não domina.

## Decisão

Escolhido o **player web empacotado para Tizen e Android TV, com box Android nas demais TVs**, porque o mesmo código TypeScript do painel roda nas duas plataformas que documentam download e armazenamento em arquivo, e o box cobre webOS e TV comum com o mesmo build Android. A prova de conceito de 72 horas offline continua obrigatória antes do piloto, agora nas TVs Samsung e no box.

## Consequências

- Bom: manifesto, regras de ciclo e formato de exibição são TypeScript compartilhado com a API, então mudança de contrato quebra a compilação do player como quebra a do painel.
- Bom: TV LG e TV comum usam o mesmo build do Android TV, então só existem dois pacotes para homologar.
- Ruim: o exibidor com TV LG precisa de um box na HDMI, o que é custo e instalação a mais na adoção.
- Ruim: no Tizen, o armazenamento web é limitado a 5 MB e o sistema de arquivos do app não declara cota, então vídeo vai para `wgt-private` e o espaço livre tem que entrar no heartbeat.
- Ruim: o motor web varia de Chromium 47 a 130 entre modelos Samsung, então o player é compilado para o motor mais antigo homologado, não para o navegador atual do painel.

## Referências

Consultado em 2026-10-24.

- [webOS TV: JS service basics](https://webostv.developer.lge.com/develop/guides/js-service-basics): diz que baixar arquivo para a TV a partir de app web não é suportado, e que o arquivo baixado por um serviço não fica acessível ao app web.
- [webOS TV: DB8 FAQ](https://webostv.developer.lge.com/develop/guides/db8-faq): limite de 10 MB compartilhado entre todos os apps, sem consulta de espaço livre.
- [Samsung Smart TV: Managing file operations](https://developer.samsung.com/smarttv/develop/guides/data-handling/managing-file-operations.html): raiz `wgt-private` para conteúdo do app, com privilégio `filesystem.write`, sem cota declarada.
- [Samsung Smart TV: Using web storage](https://developer.samsung.com/smarttv/develop/guides/data-handling/using-web-storage.html): armazenamento web limitado a 5 MB por app.
- [Samsung Smart TV: Downloading data](https://developer.samsung.com/smarttv/develop/guides/data-handling/downloading-data.html): API `tizen.download` com privilégio `download`.
- [Samsung Smart TV: Web engine specifications](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html): Chromium 47 a 130 conforme a versão do Tizen.
- [Android: WebView](https://developer.android.com/guide/webapps/webview): app web dentro de uma activity, com ponte para APIs nativas.
- [Android: Media3 ExoPlayer](https://developer.android.com/media/media3/exoplayer): player padrão do Media3 para a reprodução nativa no Android TV.
