---
status: accepted
date: 2026-10-24
title: "Usar AWS como plataforma de nuvem"
description: "Por que AWS em sa-east-1 em vez de Google Cloud ou PaaS: região em São Paulo com todos os serviços gerenciados do HLD num só fornecedor, e os PaaS com região no Brasil não cobrem fila, e-mail e chave de criptografia."
supersedes:
superseded-by:
---

# 0006. Usar AWS como plataforma de nuvem

## Contexto e problema

O HLD roda API e Worker em contêiner, um PostgreSQL com PostGIS (ADR-0003), Redis, armazenamento de objetos com CDN para criativos e para o painel estático (ADR-0004), cifra de dados de recebimento com chave gerenciada e segredos com rotação. O time é pequeno, então operar banco, fila e certificado na mão não cabe. Dados pessoais estão sob a LGPD e as TVs e o painel estão no Brasil, o que pede região no país. A meta é 1.000 telas sem trocar de arquitetura.

## Opções consideradas

- **AWS em sa-east-1**: ECS Fargate, RDS PostgreSQL com PostGIS, ElastiCache, S3, CloudFront, KMS e Secrets Manager, todos gerenciados e na mesma conta.
- **Google Cloud em southamerica-east1**: Cloud Run e Cloud SQL com PostGIS em São Paulo atendem o núcleo, mas e-mail transacional não é serviço nativo e entraria um fornecedor a mais.
- **PaaS gerenciado (Render, Railway, Fly.io)**: Render e Railway não têm região no Brasil; o Fly.io tem `gru` com Postgres gerenciado, mas fila, e-mail, CDN de objetos e chave de criptografia viriam de terceiros.

## Decisão

Escolhida a **AWS em sa-east-1**, porque é a única opção que põe em São Paulo, num só fornecedor e sob o mesmo IAM, tudo o que o HLD usa, inclusive e-mail (ADR-0011) e autenticação (ADR-0009). O Google Cloud cumpre o núcleo e foi a alternativa mais próxima; perdeu pelos serviços periféricos que exigiriam fornecedores extras.

## Consequências

- Bom: cada serviço acessa banco, fila, S3 e segredos por papel IAM, sem chave de acesso estática em variável de ambiente.
- Bom: o PostGIS é extensão suportada no RDS, então a restrição de hospedagem do ADR-0003 está atendida.
- Ruim: sa-east-1 está entre as regiões mais caras da AWS, então o custo de 1.000 telas precisa ser estimado com o preço de São Paulo, não com o de us-east-1.
- Ruim: Fargate, ElastiCache, CloudFront e KMS amarram a infraestrutura à AWS; migrar de nuvem é refazer a camada de implantação, não só trocar a imagem do contêiner.
- Ruim: a infraestrutura de duas contas (homologação e produção) precisa de código (Terraform ou CDK), senão as duas divergem na primeira mudança manual.

## Referências

Consultado em 2026-10-24.

- [AWS: Regions](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html): `sa-east-1` em São Paulo, com 3 zonas de disponibilidade e habilitada por padrão.
- [Amazon RDS: PostGIS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.PostGIS.html): `CREATE EXTENSION postgis` no RDS PostgreSQL, com o papel `rds_superuser`.
- [Google Cloud: Regions and zones](https://docs.cloud.google.com/compute/docs/regions-zones): `southamerica-east1` em Osasco, São Paulo, única região do Google no Brasil.
- [Cloud Run: Locations](https://docs.cloud.google.com/run/docs/locations): Cloud Run disponível em `southamerica-east1`.
- [Cloud SQL: PostgreSQL extensions](https://docs.cloud.google.com/sql/docs/postgres/extensions): PostGIS suportado em todas as versões maiores, o que torna o Google Cloud viável para o ADR-0003.
- [Fly.io: Regions](https://docs.fly.io/reference/regions): região `gru` em São Paulo com Postgres gerenciado.
- [Render: Regions](https://render.com/docs/regions): só Oregon, Ohio, Virgínia, Frankfurt e Singapura, sem Brasil.
- [Railway: Deployment regions](https://docs.railway.com/reference/deployment-regions): só Califórnia, Virgínia, Amsterdã e Singapura, sem Brasil.
