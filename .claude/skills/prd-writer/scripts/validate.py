#!/usr/bin/env python3
"""Valida a estrutura de um PRD gerado pela skill prd-writer.

Uso: python3 validate.py docs/product/prd.md

Checa o que é mecânico: seções obrigatórias na ordem do template, requisitos funcionais
completos (com critérios de aceitação próprios), placeholders esquecidos, blocos 'Depende
de' coerentes (citam RFs e DEPs existentes, motivo dado|fluxo|regra, sem ciclo, prioridade
herdada para trás) e cada dependência 'dado' com critério de integração. Grafo, ondas e
caminho crítico não ficam no PRD: roadmap.py os gera destes mesmos blocos. Sai com código 1
quando há erro. Avisos não derrubam. Só biblioteca padrão. roadmap.py importa os parsers
daqui.
"""
import re
import sys
from pathlib import Path

REQUIRED_SECTIONS = [
    "Resumo",
    "Contexto e problema",
    "Objetivos e métricas",
    "Escopo",
    "Requisitos funcionais",
    "Requisitos não funcionais",
    "Decisões de produto e trade-offs",
    "Dependências",
    "Riscos e mitigação",
    "Critérios de aceitação",
    "Validação",
]
# Seção de versões antigas do template; mapa e ondas agora são do roadmap.
OLD_MAP_SECTION = "Mapa de dependências e paralelismo"
NFR_REQUIRED = ["Performance", "Disponibilidade"]
PRIORITIES = {"alta", "media", "média", "baixa"}
RANK = {"alta": 3, "media": 2, "baixa": 1}
EDGE_LABELS = {"dado", "fluxo", "regra"}
DEP_TYPES = {"externa", "organizacional", "pré-requisito"}
STACK_WORDS = re.compile(
    r"\b(postgres\w*|mysql|mongodb|redis|kafka|rabbitmq|react|vue|angular|django|rails|"
    r"spring|node\.?js|typescript|python|java|golang|kotlin|docker|kubernetes|aws|azure|gcp|"
    r"grpc|graphql|rest api|microsservi\w+|monólito|monolito)\b",
    re.IGNORECASE,
)

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def norm_id(raw):
    """RF001, RF-001, rf001 -> RF-001; DEP1 -> DEP-1."""
    m = re.fullmatch(r"([A-Za-z]+)-?(\d+)", raw.strip())
    if not m:
        return raw.strip()
    prefix, num = m.group(1).upper(), m.group(2)
    if prefix == "RF":
        return f"RF-{int(num):03d}"
    return f"{prefix}-{int(num)}"


def split_sections(text):
    """Retorna lista (titulo_h2, corpo) na ordem do arquivo."""
    parts = re.split(r"^## (.+)$", text, flags=re.MULTILINE)
    sections = []
    for i in range(1, len(parts), 2):
        sections.append((parts[i].strip(), parts[i + 1]))
    return sections


def check_header(text):
    if not re.search(r"^# PRD: \S", text, re.MULTILINE):
        err("título deve ser '# PRD: <nome do sistema>'")
    for field in ("Versão:", "Data:", "Responsável:"):
        if not re.search(rf"^{field} \S", text, re.MULTILINE):
            err(f"cabeçalho sem '{field} ...'")
    m = re.search(r"^Data: (\S+)", text, re.MULTILINE)
    if m and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", m.group(1)):
        err(f"Data '{m.group(1)}' não está em AAAA-MM-DD")


def check_sections(sections):
    titles = [t for t, _ in sections]
    missing = [s for s in REQUIRED_SECTIONS if s not in titles]
    for s in missing:
        err(f"seção obrigatória ausente: '## {s}'")
    present = [s for s in REQUIRED_SECTIONS if s in titles]
    order = [t for t in titles if t in REQUIRED_SECTIONS]
    if order != present:
        err("seções obrigatórias fora da ordem do template")
    if OLD_MAP_SECTION in titles:
        err(f"'## {OLD_MAP_SECTION}' não fica mais no PRD: declare '**Depende de**' em cada RF "
            "e rode roadmap.py, que gera grafo, ondas e caminho crítico")
    extra = [t for t in titles if t not in REQUIRED_SECTIONS and t != OLD_MAP_SECTION]
    for t in extra:
        warn(f"seção fora do template: '## {t}'")


def check_placeholders(text):
    # [texto em minúsculas sem link] é placeholder do template esquecido.
    for m in re.finditer(r"\[([a-záéíóúâêôãõç][^\]\n]{2,})\](?!\()", text):
        inner = m.group(1)
        if inner.startswith("RF-") or inner.startswith("DEP-") or inner.startswith("x") or inner == " ":
            continue
        err(f"placeholder não preenchido: [{inner[:40]}]")
    if "AAAA-MM-DD" in text:
        err("data do cabeçalho ainda é AAAA-MM-DD")


def check_goals(body):
    rows = [l for l in body.splitlines() if l.startswith("|")]
    data = [r for r in rows[2:] if r.strip("| ").strip()]
    if not data:
        err("tabela de objetivos sem linhas")
    for r in data:
        cells = [c.strip() for c in r.strip().strip("|").split("|")]
        if len(cells) < 3 or any(not c for c in cells[:3]):
            err(f"objetivo incompleto (objetivo, métrica, meta): {r.strip()[:60]}")
        elif not re.search(r"\d", cells[2]):
            warn(f"meta sem número: '{cells[2][:50]}'")


def rf_blocks(body):
    """Retorna lista (id, nome, bloco) dos '### RF-NNN Nome' da seção de requisitos."""
    out = []
    for b in re.split(r"^### ", body, flags=re.MULTILINE)[1:]:
        m = re.match(r"(RF-\d{3})\s+(.+)", b.splitlines()[0].strip())
        out.append((m.group(1), m.group(2).strip(), b) if m else (None, b.splitlines()[0].strip(), b))
    return out


def bullets_after(block, title):
    """Itens '- ...' logo abaixo de '**title**'; None se o bloco não existe."""
    m = re.search(rf"^\*\*{re.escape(title)}\*\*\n((?:- .*\n?)*)", block, re.MULTILINE)
    if not m:
        return None
    return [l[2:].strip() for l in m.group(1).strip().splitlines() if l.startswith("- ")]


DEPENDS_ITEM = re.compile(r"((?:RF|DEP)-?\d+)\s*\((\w+)\)\s*:\s*(\S.*)")


def parse_depends(block):
    """Itens de '**Depende de**': lista (origem, motivo, o quê); None se o bloco não existe.

    Item fora do padrão '- RF-NNN (dado|fluxo|regra): o quê' volta como (None, None, item).
    """
    items = bullets_after(block, "Depende de")
    if items is None:
        return None
    out = []
    for item in items:
        m = DEPENDS_ITEM.match(item)
        out.append((norm_id(m.group(1)), m.group(2).lower(), m.group(3)) if m else (None, None, item))
    return out


def parse_dep_headings(body):
    """Cabeçalhos '### DEP-N tipo: título' da seção Dependências: lista (id, tipo, título, cabeçalho)."""
    out = []
    for b in re.split(r"^### ", body, flags=re.MULTILINE)[1:]:
        head = b.splitlines()[0].strip()
        m = re.match(r"(DEP-?\d+)\s+([\wé-]+):\s*(\S.*)", head)
        out.append((norm_id(m.group(1)), m.group(2).lower(), m.group(3).strip(), head) if m else (None, None, None, head))
    return out


def parse_priority(block):
    pm = re.search(r"\*\*Prioridade:\*\*\s*(\S+)", block)
    if not pm:
        return None
    p = pm.group(1).lower().strip("*")
    return "media" if p == "média" else p


def check_rfs(body):
    blocks = re.split(r"^### ", body, flags=re.MULTILINE)[1:]
    ids, prios, edges = [], {}, []
    if not blocks:
        err("nenhum requisito funcional (### RF-NNN Nome)")
    for b in blocks:
        head = b.splitlines()[0].strip()
        m = re.match(r"(RF-\d{3})\s+(.+)", head)
        if not m:
            err(f"cabeçalho de RF fora do padrão '### RF-NNN Nome': '{head[:50]}'")
            continue
        rid = m.group(1)
        if rid in ids:
            err(f"{rid} duplicado")
        ids.append(rid)
        desc = [l for l in b.splitlines()[1:] if l.strip() and not l.startswith("**")]
        if not desc or desc[0].startswith("-"):
            err(f"{rid} sem descrição em uma frase antes do fluxo")
        if not re.search(r"^\*\*Para quem:\*\* \S", b, re.MULTILINE):
            err(f"{rid} sem '**Para quem:** <público e ganho>'")
        if bullets_after(b, "Usa de") is not None:
            err(f"{rid} usa '**Usa de**', de versão antiga; troque por '**Depende de**' com '- RF-NNN (dado): o quê'")
        deps = parse_depends(b)
        if deps is not None:
            if not deps:
                err(f"{rid} tem '**Depende de**' vazio; remova o bloco ou liste '- RF-NNN (dado|fluxo|regra): o quê'")
            for src, lbl, what in deps:
                if src is None:
                    err(f"{rid} 'Depende de' fora do padrão '- RF-NNN (dado|fluxo|regra): o quê': '{what[:50]}'")
                elif lbl not in EDGE_LABELS:
                    err(f"{rid} depende de {src} com motivo '{lbl}'; use dado, fluxo ou regra")
                else:
                    edges.append((src, lbl, rid))
        crit = bullets_after(b, "Critérios de aceitação")
        if crit is None:
            err(f"{rid} sem '**Critérios de aceitação**' com itens")
        elif len(crit) < 2:
            err(f"{rid} com {len(crit)} critério(s) de aceitação; mínimo 2 (sucesso e falha)")
        elif len(crit) > 5:
            warn(f"{rid} com {len(crit)} critérios de aceitação (orçamento: 2 a 5)")
        fm = re.search(r"\*\*Fluxo principal\*\*\n((?:- .*\n?)+)", b)
        if not fm:
            err(f"{rid} sem '**Fluxo principal**' com passos")
        else:
            n = len(fm.group(1).strip().splitlines())
            if n < 3 or n > 8:
                warn(f"{rid} fluxo principal com {n} passos (orçamento: 3 a 8)")
        if "**Fluxos alternativos e exceções**" not in b:
            err(f"{rid} sem '**Fluxos alternativos e exceções**'")
        # Erros previstos é condicional (só RF que mexe em dado, dinheiro, permissão ou é
        # irreversível); o critério é de julgamento, então o validador não cobra.
        p = parse_priority(b)
        if p is None:
            err(f"{rid} sem '**Prioridade:** alta|media|baixa'")
        elif p not in PRIORITIES:
            err(f"{rid} prioridade inválida '{p}'")
        else:
            prios[rid] = p
    if len(ids) > 15:
        warn(f"{len(ids)} RFs; acima de 15 costuma ser mais de uma entrega")
    seq = [int(i[3:]) for i in ids]
    if seq != sorted(seq):
        warn("RFs fora de ordem numérica")
    return ids, prios, edges


def check_nfr(body):
    for cat in NFR_REQUIRED:
        if not re.search(rf"^{cat}\n- \S", body, re.MULTILINE):
            err(f"requisitos não funcionais sem '{cat}' com pelo menos uma meta")


def check_risks(body):
    blocks = re.split(r"^### ", body, flags=re.MULTILINE)[1:]
    if not blocks:
        warn("nenhum risco listado")
    for b in blocks:
        name = b.splitlines()[0].strip()[:50]
        for field in ("Probabilidade", "Impacto", "Mitigação", "Plano de contingência"):
            if f"**{field}:**" not in b:
                err(f"risco '{name}' sem '**{field}:**'")
        pm = re.search(r"\*\*Probabilidade:\*\*\s*(\S+)", b)
        if pm and pm.group(1).lower() not in PRIORITIES:
            err(f"risco '{name}' com probabilidade inválida '{pm.group(1)}'")
        if "**Mitigação:**" in b and not re.search(r"\*\*Mitigação:\*\*\n(?:\s+- \S)", b):
            err(f"risco '{name}': mitigação deve ser lista de subitens")


def check_decisions(body):
    blocks = re.split(r"^### ", body, flags=re.MULTILINE)[1:]
    for b in blocks:
        name = b.splitlines()[0].strip()[:50]
        for field in ("Justificativa", "Trade-off"):
            if f"**{field}:**" not in b:
                err(f"decisão '{name}' sem '**{field}:**'")


def check_dependencies(body):
    """Cabeçalhos da seção Dependências com id; devolve os DEP-N declarados."""
    ids = []
    for did, typ, _, head in parse_dep_headings(body):
        if did is None:
            err(f"dependência fora do padrão '### DEP-N tipo: título': '{head[:50]}'")
            continue
        if typ not in DEP_TYPES:
            err(f"{did} com tipo '{typ}'; use externa, organizacional ou pré-requisito")
        if did in ids:
            err(f"{did} duplicado em Dependências")
        ids.append(did)
    return ids


def check_graph(rf_ids, prios, edges, dep_ids):
    """Coerência das arestas declaradas nos blocos 'Depende de'."""
    rf_set, dep_set = set(rf_ids), set(dep_ids)
    for a, _, b in edges:
        if a == b:
            err(f"{b} depende de si mesmo")
        elif a.startswith("RF-") and a not in rf_set:
            err(f"{b} depende de {a}, que não existe nos requisitos funcionais")
        elif a.startswith("DEP-") and a not in dep_set:
            err(f"{b} depende de {a}, que não está em Dependências como '### {a} tipo: título'")
    pairs = [(a, b) for a, _, b in edges]
    for p in sorted({p for p in pairs if pairs.count(p) > 1}):
        err(f"{p[1]} cita {p[0]} mais de uma vez em 'Depende de'; um item por origem")
    used_deps = {a for a, _, _ in edges if a.startswith("DEP-")}
    for d in sorted(dep_set - used_deps):
        warn(f"{d} não trava nenhum RF; se trava, cite-o no 'Depende de' do RF")
    # ciclos e arestas transitivas
    succ = {}
    for a, b in pairs:
        succ.setdefault(a, set()).add(b)

    def reach(start):
        seen, stack = set(), [start]
        while stack:
            x = stack.pop()
            for y in succ.get(x, ()):
                if y not in seen:
                    seen.add(y)
                    stack.append(y)
        return seen

    for n in sorted(succ):
        if n in reach(n):
            err(f"ciclo nas dependências envolvendo {n}: os RFs são um só ou um deles precisa ser dividido")
            break
    for a, b in sorted(set(pairs)):
        others = succ[a] - {b}
        if any(b in reach(o) for o in others):
            warn(f"{b} depende de {a} diretamente e também por outro caminho; deixe só a dependência direta")
    # prioridade herda para trás
    for a, b in sorted(set(pairs)):
        pa, pb = prios.get(a), prios.get(b)
        if pa and pb and RANK[pa] < RANK[pb]:
            err(f"{b} ({pb}) depende de {a} ({pa}): a prioridade de {a} precisa subir")
    # nós atípicos: questionar, não proibir
    for rid in rf_ids:
        ins = {a for a, b in pairs if b == rid}
        outs = {b for a, b in pairs if a == rid}
        if not ins and not outs and len(rf_ids) > 1:
            warn(f"{rid} sem dependência nenhuma; confirme que não lê nem alimenta nenhum outro RF")
        if len(ins) >= 4:
            warn(f"{rid} com {len(ins)} dependências; confira se todas são dado, fluxo ou regra de verdade")


def check_integration(body, edges):
    """Cada dependência 'dado' precisa de um critério transversal citando os dois lados."""
    lines = [l for l in body.splitlines() if l.startswith("- ")]
    for a, lbl, b in edges:
        if lbl == "dado" and not any(a in l and b in l for l in lines):
            err(f"critérios de aceitação sem item de integração citando {a} e {b}")


def check_style(text):
    if "—" in text:
        warn(f"{text.count('—')} travessão(ões) '—' no texto; a regra do PRD é não usar")
    hyp = len(re.findall(r"\(hipótese\)", text))
    if hyp > 30:
        warn(f"{hyp} hipóteses; acima de 30 o documento está decidindo demais pelo usuário "
             "(a mesma hipótese marcada em vários RFs conta várias vezes: uma marca por decisão)")
    variants = re.findall(r"\(hipótese[:,]? [^)]{1,60}\)", text)
    if variants:
        warn(f"{len(variants)} marca(s) na forma '(hipótese ...)', ex.: {variants[0]!r}; "
             "use a forma literal '(hipótese)' no fim da linha, que é a que o validador conta")
    lines = text.count("\n")
    if lines > 1000:
        warn(f"{lines} linhas; orçamento do PRD é 250 a 1000")
    body_no_code = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    for m in STACK_WORDS.finditer(body_no_code):
        warn(f"termo de stack no PRD: '{m.group(0)}' (vai para ADR, salvo integração obrigatória)")
    return hyp


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"arquivo não encontrado: {path}")
        return 2
    text = path.read_text(encoding="utf-8")
    check_header(text)
    sections = split_sections(text)
    check_sections(sections)
    check_placeholders(text)
    by_title = dict(sections)
    rf_ids, prios, edges, dep_ids = [], {}, [], []
    if "Objetivos e métricas" in by_title:
        check_goals(by_title["Objetivos e métricas"])
    if "Requisitos funcionais" in by_title:
        rf_ids, prios, edges = check_rfs(by_title["Requisitos funcionais"])
    if "Requisitos não funcionais" in by_title:
        check_nfr(by_title["Requisitos não funcionais"])
    if "Dependências" in by_title:
        dep_ids = check_dependencies(by_title["Dependências"])
    check_graph(rf_ids, prios, edges, dep_ids)
    if "Decisões de produto e trade-offs" in by_title:
        check_decisions(by_title["Decisões de produto e trade-offs"])
    if "Riscos e mitigação" in by_title:
        check_risks(by_title["Riscos e mitigação"])
    if "Critérios de aceitação" in by_title:
        check_integration(by_title["Critérios de aceitação"], edges)
    hyp = check_style(text)

    for w in warnings:
        print(f"aviso: {w}")
    for e in errors:
        print(f"erro: {e}")
    print(f"{path}: {len(rf_ids)} RFs, {hyp} hipóteses, {len(errors)} erro(s), {len(warnings)} aviso(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
