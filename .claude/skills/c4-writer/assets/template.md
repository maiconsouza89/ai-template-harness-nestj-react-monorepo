# C4: [Nome do sistema ou da feature]

Fonte: [caminho do documento de origem] versão [X.Y.Z, ou "não informada"]
ADRs: [números dos ADRs aceitos usados, como 0002, 0003; ou "nenhum"]
Data: [AAAA-MM-DD]

---

## Diagramas

| Nível | Arquivo | Público | O que mostra |
| --- | --- | --- | --- |
| C1 System Context | `[nome]-c1.puml` | Produto e negócio | [atores, o sistema e os sistemas externos, em uma frase] |
| C2 Container | `[nome]-c2.puml` | Arquitetura e liderança técnica | [unidades de implantação e tecnologias, em uma frase] |
| C3 Component | `[nome]-c3-[container].puml` | Quem implementa o container | [componentes internos de qual container, em uma frase] |
| C4 Code Level | pulado | Quem implementa | [motivo: o que falta na fonte para este nível] |

Para ver: `sh .claude/skills/c4-writer/scripts/render.sh docs/architecture/diagrams` gera SVG ao
lado de cada `.puml` (precisa de plantuml local ou docker).

---

## Origem dos elementos

| Elemento | Diagramas | Origem |
| --- | --- | --- |
| [rótulo exato do elemento no diagrama] | [C1, C2] | [seção da fonte e ADR, como "HLD, Componentes e responsabilidades; ADR-0002"] |

---

## Hipóteses

- [rótulo do elemento ou da relação]: [o que foi completado e por que, ligado ao trecho da fonte que sugere]

---

## Fora do escopo

- [o que a fonte cita mas ficou fora dos diagramas, e por quê; ou "nada ficou de fora"]

---

## Conflitos e lacunas

- [contradição entre fonte e ADR, ou informação que falta para um nível; ou "nenhum"]
