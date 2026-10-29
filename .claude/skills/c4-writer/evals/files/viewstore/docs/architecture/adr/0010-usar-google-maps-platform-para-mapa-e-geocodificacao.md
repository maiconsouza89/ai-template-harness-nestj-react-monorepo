---
status: accepted
date: 2026-10-24
title: "Usar Google Maps Platform para mapa e geocodificação"
description: "Por que Google Maps Platform em vez de Mapbox ou MapLibre com geocodificador pago: é o único com acerto medido em endereço brasileiro, e o volume do piloto cabe na cota grátis."
supersedes:
superseded-by:
---

# 0010. Usar Google Maps Platform para mapa e geocodificação

## Contexto e problema

O cadastro do estabelecimento converte o endereço em coordenada e o exibidor confirma o ponto (RF-001, DEP-2), e o mapa público mostra as telas a visitantes anônimos (RF-009). Endereço brasileiro errado põe a tela no lugar errado do mapa e o anunciante compra a tela errada, então acerto de geocodificação pesa mais. Mapa aberto sem login cobra por carregamento, então o custo cresce com visitantes e não com clientes. O piloto é regional, com 100 telas.

## Opções consideradas

- **Google Maps Platform**: Geocoding e Dynamic Maps com 10.000 chamadas grátis por mês cada; depois, US$ 5 e US$ 7 por mil.
- **Mapbox**: 50.000 carregamentos de mapa grátis por mês, mas guardar o resultado da geocodificação exige a modalidade permanente, sem cota grátis e a US$ 5 por mil.
- **MapLibre com geocodificador pago**: renderizador aberto (BSD) sem custo por carregamento, mas exige provedor de tiles e um geocodificador que não seja o Google, porque resultado do Google só pode aparecer num mapa do Google.

## Decisão

Escolhido o **Google Maps Platform**, porque foi o único com acerto medido em endereço brasileiro que encontramos (85,7 por cento geocodificado em 132.863 endereços no Rio de Janeiro), e o volume do piloto fica dentro da cota grátis. O custo do mapa anônimo é o ponto a vigiar; trocar só o renderizador exigiria trocar também o geocodificador, o que seria um ADR novo.

## Consequências

- Bom: geocodificação é chamada só no cadastro, então 10.000 por mês grátis cobrem bem mais que os 70 estabelecimentos do piloto.
- Ruim: os termos limitam o cache de coordenada da Geocoding API a 30 dias, salvo quando substituída por dado confirmado pelo usuário; por isso o banco guarda o ponto confirmado pelo exibidor e o `place_id`, nunca a coordenada crua da API.
- Ruim: o navegador carrega o mapa direto do Google, então cache e rate limit da API não reduzem a conta; acima de 10.000 carregamentos por mês cada mil custa US$ 7, e um alerta de orçamento no console do Google tem que existir antes de divulgar o mapa.
- Ruim: a chave do mapa fica exposta no navegador, então só funciona restrita por domínio e por API; sem a restrição, qualquer site gasta a cota do viewstore.

## Referências

Consultado em 2026-10-24.

- [Google Maps Platform: mudanças de março de 2025](https://developers.google.com/maps/billing-and-pricing/march-2025): crédito mensal de US$ 200 substituído por cota grátis por SKU.
- [Google Maps Platform: Pricing](https://developers.google.com/maps/billing-and-pricing/pricing): Dynamic Maps a US$ 7 e Geocoding a US$ 5 por mil depois de 10.000 grátis.
- [Google Maps Platform: Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms): coordenada da Geocoding API em cache por até 30 dias corridos; conteúdo pode ser substituído por dado confirmado ou corrigido pelo usuário final.
- [Geocoding API: Policies](https://developers.google.com/maps/documentation/geocoding/policies): `place_id` pode ser guardado sem prazo; resultado mostrado em mapa tem que estar num mapa do Google.
- [Mapbox: Pricing](https://www.mapbox.com/pricing): 50.000 carregamentos grátis e depois US$ 5 por mil; geocodificação permanente sem cota grátis a US$ 5 por mil.
- [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js): licença BSD 3-Clause, fork do Mapbox GL JS, recebe um estilo com fonte de tiles externa.
- [Cadernos de Saúde Pública, 2021](https://scielo.br/j/csp/a/PzqnKn6Zs5CjHC9RkR6pdMq): Google Geocoding API em 132.863 registros no Rio de Janeiro, 85,7 por cento geocodificados e validados; não há comparação com outros provedores.
