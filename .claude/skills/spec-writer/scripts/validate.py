#!/usr/bin/env python3
"""Valida as pastas de feature geradas pela skill spec-writer.

Uso:
  python3 validate.py docs/features/RF-010-contratar-anuncio-direto
  python3 validate.py docs/features            (todas as pastas)
Opções: --raiz <dir> (padrão: três níveis acima da pasta da feature, onde fica docs/).

Checa a forma dos três arquivos (spec.md, plan.md, contract.md) e cruza com o PRD, o HLD, os
ADRs e o roadmap: manifesto com o texto literal de cada critério que entra (os do RF e os de
integração em que ele é o destino) e com pelo menos um item existente por critério (o
portão de cobertura), RF ou DEP citado no contrato fora do fecho de dependências, handles de
pré-requisito sem declaração ou sem uso, superfícies e IDs de item, ADR citado superseded,
componente fora do HLD, plano com fase de testes, superfície do contrato sem mecanismo de
verificação decidido na tabela 'Verificação por superfície' da spec, e item cujo Dado ou Quando
exige PR, push ou run da CI (a CI é conferida no Fechamento da implement-and-evaluate, não no
contrato). Avisa quando PRD ou HLD subiram de versão depois da spec. Sai com código 1 quando há erro; avisos não derrubam. Só biblioteca padrão.
"""
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from contexto import (  # noqa: E402
    ADR_DIR,
    FUNDACAO,
    bullets_after,
    closure,
    read_hld,
    read_prd,
    read_status,
    slug,
    split_sections,
)

SPEC_SECTIONS = ["Escopo", "Regras e fluxos", "Componentes", "Contratos de interface", "Modelo de dados",
                 "Tratamento de erros", "Estratégia de testes", "Decisões e hipóteses", "Rastreabilidade"]
FUND_EXTRA = "Convenções para as features"
FUND_CONVENTIONS = ["Estrutura de pastas", "Testes", "Estado persistido", "Entradas estáticas",
                    "Configuração de teste", "Dependências externas"]
ESCOPO_LABELS = ["Incluído", "Entradas", "Saídas", "Fora desta spec"]
DECISION_LABELS = ["Decisões", "Hipóteses", "Pendentes de ADR"]
COMPLEXITY = {"trivial": (1, 2, 2, 4), "simples": (2, 3, 5, 8), "média": (3, 4, 10, 15), "complexa": (4, 5, 15, 25)}
SURFACES = [("Serviço", "SVC"), ("API HTTP", "API"), ("CLI", "CLI"), ("UI", "UI"), ("Worker", "WRK"),
            ("Evento", "EVT"), ("E2E", "E2E")]
SURFACE_CODE = dict(SURFACES)
PREREQ_SUBS = ["Serviços em execução", "Estado persistido", "Entradas estáticas", "Configuração",
               "Dependências externas"]
ITALIC = "*Gerado pela skill spec-writer. Edições à mão são sobrescritas na regeneração.*"
ITEM_ID = re.compile(r"^(SVC|API|CLI|UI|WRK|EVT|E2E)-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{2}$")
ID_REF = re.compile(r"\b(?:SVC|API|CLI|UI|WRK|EVT|E2E)-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{2}\b")
HANDLE_DECL = re.compile(r"^`([^`]+)`:\s*(\S.*?)\s*Usado por:\s*(.+)$")
GATE = re.compile(r"^\*\*[^*]+\*\*:\s*`[^`]+`\.\s*\S")
CONSUMER_WORDS = re.compile(r"agente implementador|agente avaliador|\bavaliador|implementing agent|"
                            r"evaluat(?:or|ing agent)", re.IGNORECASE)
TIME_WORDS = re.compile(r"\b\d+\s*(?:h|horas?|dias?|semanas?|sprints?)\b", re.IGNORECASE)
TEST_PHASE = re.compile(r"\b(testes?|qa|validação|homologação)\b", re.IGNORECASE)
ADR_REF = re.compile(r"ADR-(\d{4})")
FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
VERIFY_LABEL = "Verificação por superfície"
VERIFY_DECISION = re.compile(r"^(ADR-\d{4}|não precisa|fundação|pendente de ADR)$")
BROWSER_SURFACES = {"UI", "E2E"}
NEEDS_REMOTE = re.compile(r"\bPR\b|\b(?:na|da) CI\b|(?i:pull request|\bgit push\b|\bworkflow\b.*\broda\b)")


class Report:
    def __init__(self, name):
        self.name, self.errors, self.warnings = name, [], []

    def err(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)


def norm_text(s):
    s = re.sub(r"\s+", " ", s.replace("\\|", "|")).strip()
    return s[:-1] if s.endswith(".") else s


def labeled_bullets(body, label):
    """Itens '- ...' logo abaixo de uma linha que é só o rótulo; None se o rótulo não existe."""
    m = re.search(rf"^{re.escape(label)}\s*\n((?:- .*\n?)*)", body, re.MULTILINE)
    if not m:
        return None
    return [l[2:].strip() for l in m.group(1).splitlines() if l.startswith("- ")]


def table_rows(body):
    rows = []
    for line in body.splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
        if all(set(c) <= set("-: ") for c in cells):
            continue
        rows.append(cells)
    return rows  # rows[0] é o cabeçalho


def verification_table(strategy):
    """Linhas da tabela 'Verificação por superfície': {superfície: (mecanismo, decisão)}; None sem a tabela."""
    lines = strategy.splitlines()
    try:
        start = next(i for i, l in enumerate(lines) if l.strip() == VERIFY_LABEL)
    except StopIteration:
        return None
    block = []
    for l in lines[start + 1:]:
        if l.startswith("|"):
            block.append(l)
        elif block or l.strip():
            break
    rows = table_rows("\n".join(block))[1:]
    return {r[0]: (r[1] if len(r) > 1 else "", r[2] if len(r) > 2 else "") for r in rows if r and r[0]}


def version_tuple(v):
    return tuple(int(x) for x in re.findall(r"\d+", v)[:3]) or (0,)


def load_adrs(root):
    adrs = {}
    d = root / ADR_DIR
    if not d.is_dir():
        return adrs
    for p in d.glob("[0-9][0-9][0-9][0-9]-*.md"):
        status = ""
        fm = FM_RE.match(p.read_text(encoding="utf-8"))
        if fm:
            m = re.search(r"^status:\s*(\S+)", fm.group(1), re.MULTILINE)
            status = m.group(1).strip("\"'") if m else ""
        adrs[p.name[:4]] = status
    return adrs


def check_common(rep, text, fname):
    for m in re.finditer(r"\[([a-záéíóúâêôãõç][^\]\n]{2,})\](?!\()", text):
        if not m.group(1).startswith(("x", " ")):
            rep.err(f"{fname}: placeholder não preenchido: [{m.group(1)[:40]}]")
    if re.search(r"RF-NNN|X\.Y\.Z", text):
        rep.err(f"{fname}: placeholder do template esquecido (RF-NNN ou X.Y.Z)")
    if "—" in text:
        rep.warn(f"{fname}: {text.count('—')} travessão(ões) '—'; a regra da documentação é não usar")


def check_adr_refs(rep, text, fname, adrs):
    for num in sorted(set(ADR_REF.findall(text))):
        st = adrs.get(num)
        if st is None:
            rep.err(f"{fname}: ADR-{num} citado não existe em {ADR_DIR}")
        elif st in ("superseded", "rejected", "deprecated"):
            rep.err(f"{fname}: ADR-{num} citado está {st}; cite o sucessor ou retire")
        elif st == "proposed":
            rep.warn(f"{fname}: ADR-{num} citado ainda está proposed")


# ---------- spec.md ----------

def check_spec(rep, text, ctx):
    rid, rf, prd, hld = ctx["rid"], ctx["rf"], ctx["prd"], ctx["hld"]
    fund = rid == FUNDACAO
    title = re.search(r"^# Spec: (.+)$", text, re.MULTILINE)
    if not title:
        rep.err("spec.md: título deve ser '# Spec: RF-NNN Nome' ou '# Spec: fundação'")
    elif fund and title.group(1).strip() != "fundação":
        rep.err("spec.md: título da fundação deve ser '# Spec: fundação'")
    elif not fund:
        m = re.match(r"(RF-\d{3})\s+(.+)", title.group(1).strip())
        if not m or m.group(1) != rid:
            rep.err(f"spec.md: título não começa com {rid}")
        elif rf and m.group(2).strip() != rf["name"]:
            rep.warn(f"spec.md: nome '{m.group(2).strip()}' difere do PRD '{rf['name']}'")
    pm = re.search(r"^PRD: docs/product/prd\.md versão (\S+)", text, re.MULTILINE)
    if not pm and not fund:
        rep.err("spec.md: cabeçalho sem 'PRD: docs/product/prd.md versão X.Y.Z'")
    elif pm and version_tuple(pm.group(1)) < version_tuple(prd["version"]):
        rep.warn(f"spec.md: escrita sobre o PRD {pm.group(1)}; o atual é {prd['version']} (rode a Revisão)")
    hm = re.search(r"^HLD: docs/architecture/hld\.md versão (\S+)", text, re.MULTILINE)
    if fund and not hm:
        rep.err("spec.md: a fundação exige 'HLD: docs/architecture/hld.md versão X.Y.Z'")
    elif not re.search(r"^HLD: \S", text, re.MULTILINE):
        rep.err("spec.md: cabeçalho sem 'HLD: ...' (versão, ou 'não existe')")
    if hm and hld and version_tuple(hm.group(1)) < version_tuple(hld["version"]):
        rep.warn(f"spec.md: escrita sobre o HLD {hm.group(1)}; o atual é {hld['version']} (rode a Revisão)")
    cm = re.search(r"^Complexidade: (\S+)", text, re.MULTILINE)
    complexity = cm.group(1) if cm else None
    if complexity not in COMPLEXITY:
        rep.err("spec.md: 'Complexidade:' deve ser trivial, simples, média ou complexa")
        complexity = None

    sections = split_sections(text)
    titles = [t for t, _ in sections]
    required = SPEC_SECTIONS[:7] + [FUND_EXTRA] + SPEC_SECTIONS[7:] if fund else SPEC_SECTIONS
    for s in required:
        if s not in titles:
            rep.err(f"spec.md: seção obrigatória ausente: '## {s}'")
    if [t for t in titles if t in required] != [s for s in required if s in titles]:
        rep.err("spec.md: seções fora da ordem do template")
    for t in titles:
        if t not in required:
            rep.warn(f"spec.md: seção fora do template: '## {t}'")
    by = dict(sections)

    included = []
    if "Escopo" in by:
        for label in ESCOPO_LABELS:
            items = labeled_bullets(by["Escopo"], label)
            if items is None or not items:
                rep.err(f"spec.md: Escopo sem '{label}' com itens (use 'nenhuma' quando não houver)")
            elif label == "Incluído":
                included = items
    if "Componentes" in by and hld:
        rows = table_rows(by["Componentes"])[1:]
        names = {r[0] for r in rows if r}
        if not rows:
            rep.err("spec.md: tabela de Componentes sem linhas")
        for n in sorted(names - set(hld["components"])):
            rep.warn(f"spec.md: componente '{n}' não está na tabela de componentes do HLD")
        for r in rows:
            if len(r) < 3 or not r[1] or not r[2]:
                rep.err(f"spec.md: componente sem caminho ou sem o que muda: {' | '.join(r)[:60]}")
        trace = hld["trace"].get(rid, "")
        tcomps = [c.strip() for c in trace.split("|")[2].split(",")] if trace.count("|") > 3 else []
        for c in tcomps:
            if c and c in hld["components"] and c not in names:
                rep.warn(f"spec.md: '{c}' atende {rid} na rastreabilidade do HLD e não está em Componentes")
    if "Tratamento de erros" in by and rf:
        rows = table_rows(by["Tratamento de erros"])[1:]
        if len(rows) < len(rf["errors"]):
            rep.warn(f"spec.md: {len(rf['errors'])} erro(s) previsto(s) no RF e {len(rows)} linha(s) em "
                     "Tratamento de erros")
    for sec in ("Estratégia de testes", "Rastreabilidade"):
        rows = table_rows(by.get(sec, ""))
        if rows and any("critério" in c.lower() for c in rows[0]):
            rep.err(f"spec.md: '{sec}' liga teste a critério de aceitação; essa ligação é só do manifesto do contrato")
    if "Decisões e hipóteses" in by:
        for label in DECISION_LABELS:
            if labeled_bullets(by["Decisões e hipóteses"], label) in (None, []):
                rep.err(f"spec.md: Decisões e hipóteses sem '{label}' com itens ('nenhuma' quando não houver)")
    if fund and FUND_EXTRA in by:
        lines = [l[2:] for l in by[FUND_EXTRA].splitlines() if l.startswith("- ")]
        for conv in FUND_CONVENTIONS:
            if not any(l.startswith(conv) for l in lines):
                rep.err(f"spec.md: '{FUND_EXTRA}' sem a linha '- {conv}: ...'")
    hyp = len(re.findall(r"\(hipótese\)", text))
    if hyp > 20:
        rep.warn(f"spec.md: {hyp} hipóteses; acima de 20 a spec está decidindo demais pelo usuário")
    pend = labeled_bullets(by.get("Decisões e hipóteses", ""), "Pendentes de ADR") or []
    pend = [p for p in pend if not p.lower().startswith("nenhum")]
    tools = verification_table(by.get("Estratégia de testes", ""))
    if "Estratégia de testes" in by and tools is None:
        rep.err(f"spec.md: 'Estratégia de testes' sem a tabela '{VERIFY_LABEL}' (Superfície, Mecanismo, Decisão)")
    for surf, (mech, dec) in (tools or {}).items():
        if surf not in SURFACE_CODE:
            rep.err(f"spec.md: '{VERIFY_LABEL}' cita '{surf}', que não é superfície do catálogo")
        if not mech:
            rep.err(f"spec.md: '{VERIFY_LABEL}' sem mecanismo para {surf}")
        if not VERIFY_DECISION.match(dec):
            rep.err(f"spec.md: decisão '{dec}' de {surf} em '{VERIFY_LABEL}'; use ADR-NNNN, não precisa, "
                    "fundação ou pendente de ADR")
        elif dec == "fundação" and fund:
            rep.err(f"spec.md: a fundação não herda de si mesma; decida {surf} por ADR, não precisa ou pendente de ADR")
        elif dec == "não precisa" and SURFACE_CODE.get(surf) in BROWSER_SURFACES:
            rep.err(f"spec.md: {surf} com 'não precisa'; dirigir o navegador exige ferramenta, decidida por ADR")
        elif dec == "pendente de ADR":
            if not any(re.search(rf"\b{re.escape(surf)}\b", p) or (mech and mech.lower() in p.lower())
                       for p in pend):
                rep.err(f"spec.md: {surf} está pendente de ADR em '{VERIFY_LABEL}' e não aparece em "
                        "'Pendentes de ADR'")
            else:
                rep.warn(f"spec.md: {surf} sem mecanismo decidido; a implementação fica bloqueada até o "
                         "ADR (/adr-writer)")
    return {"complexity": complexity, "included": included, "hyp": hyp, "pending": len(pend),
            "tools": tools or {}}


# ---------- plan.md ----------

def check_plan(rep, text, ctx, complexity):
    rid, fund = ctx["rid"], ctx["rid"] == FUNDACAO
    want = "# Plano: fundação" if fund else f"# Plano: {rid} "
    if not text.startswith(want):
        rep.err(f"plan.md: título deve começar com '{want.strip()}'")
    sections = split_sections(text)
    titles = [t for t, _ in sections]
    if not titles or titles[0] != "Pré-requisitos":
        rep.err("plan.md: a primeira seção deve ser '## Pré-requisitos'")
    phases = [(t, b) for t, b in sections if t.startswith("Fase")]
    nums = []
    for t, _ in phases:
        m = re.match(r"Fase (\d+): (\S.*)", t)
        if not m:
            rep.err(f"plan.md: fase fora do padrão '## Fase N: nome': '{t}'")
            continue
        nums.append(int(m.group(1)))
        if TEST_PHASE.search(m.group(2)):
            rep.err(f"plan.md: fase de testes ('{t}'); teste acompanha cada passo, não vira fase")
    if nums != list(range(1, len(nums) + 1)):
        rep.err("plan.md: fases não numeradas 1, 2, 3...")
    for t in titles:
        if t != "Pré-requisitos" and not t.startswith("Fase"):
            rep.warn(f"plan.md: seção fora do template: '## {t}'")
    steps = []
    for t, b in phases:
        found = [int(m.group(1)) for m in re.finditer(r"^(\d+)\. \*\*[^*]+:\*\* \S", b, re.MULTILINE)]
        loose = [l for l in b.splitlines() if re.match(r"^\d+\. ", l) and not re.match(r"^\d+\. \*\*[^*]+:\*\* \S", l)]
        for l in loose:
            rep.err(f"plan.md: passo fora do formato 'N. **Componente:** o quê': '{l[:50]}'")
        if not found and not loose:
            rep.err(f"plan.md: '{t}' sem passos")
        steps += found
    if steps and steps != list(range(1, len(steps) + 1)):
        rep.err("plan.md: passos não numerados de forma contínua entre as fases")
    if TIME_WORDS.search(text):
        rep.warn(f"plan.md: parece ter estimativa de tempo ('{TIME_WORDS.search(text).group(0)}')")
    if complexity:
        fmin, fmax, smin, smax = COMPLEXITY[complexity]
        if not fmin <= len(phases) <= fmax:
            rep.warn(f"plan.md: {len(phases)} fase(s) para complexidade {complexity} (orçamento {fmin} a {fmax})")
        if not smin <= len(steps) <= smax:
            rep.warn(f"plan.md: {len(steps)} passo(s) para complexidade {complexity} (orçamento {smin} a {smax})")
    return {"phases": len(phases), "steps": len(steps)}


# ---------- contract.md ----------

def parse_items(body):
    """Itens '#### ID' de uma seção de superfície: lista (id, capacidade, texto)."""
    items, cap = [], None
    for chunk in re.split(r"^(?=#{3,4} )", body, flags=re.MULTILINE):
        if chunk.startswith("### "):
            cap = chunk.splitlines()[0][4:].strip()
        elif chunk.startswith("#### "):
            items.append((chunk.splitlines()[0][5:].strip(), cap, chunk))
    return items


def check_contract(rep, text, ctx, included, tools, fund_tools):
    rid, rf, prd = ctx["rid"], ctx["rf"], ctx["prd"]
    fund = rid == FUNDACAO
    want = "# Contrato: fundação" if fund else f"# Contrato: {rid} "
    lines = text.splitlines()
    if not text.startswith(want):
        rep.err(f"contract.md: título deve começar com '{want.strip()}'")
    nxt = next((l for l in lines[1:] if l.strip()), "")
    if nxt.strip() != ITALIC:
        rep.err(f"contract.md: a linha logo abaixo do título deve ser {ITALIC}")
    if "<!--" in text:
        rep.err("contract.md: comentário HTML; use a linha em itálico abaixo do título")
    for m in CONSUMER_WORDS.finditer(text):
        rep.err(f"contract.md: nomeia quem executa ('{m.group(0)}'); o contrato descreve comportamento")
        break

    sections = split_sections(text)
    titles = [t for t, _ in sections]
    by = dict(sections)
    surface_titles = [s for s, _ in SURFACES]
    expected_head = ["Pré-requisitos"] + (["Gates de qualidade"] if "Gates de qualidade" in titles else []) + \
        ["Manifesto de cobertura"]
    if titles[:len(expected_head)] != expected_head:
        rep.err("contract.md: as seções devem começar por Pré-requisitos, Gates de qualidade (opcional) e "
                "Manifesto de cobertura, nessa ordem")
    rest = titles[len(expected_head):]
    for t in rest:
        if t not in surface_titles:
            rep.err(f"contract.md: seção '## {t}' não é superfície do catálogo ({', '.join(surface_titles)})")
    known = [t for t in rest if t in surface_titles]
    if known != sorted(known, key=surface_titles.index):
        rep.err("contract.md: superfícies fora da ordem do catálogo")
    if not known:
        rep.err("contract.md: nenhuma seção de superfície com itens")

    # itens
    items = {}
    for t in known:
        body = by[t]
        if not re.search(r"^Modo de verificação: \S", body, re.MULTILINE):
            rep.err(f"contract.md: '## {t}' sem a linha 'Modo de verificação: ...'")
        if t not in tools:
            rep.err(f"contract.md: '## {t}' sem linha em '{VERIFY_LABEL}' da spec; diga como a superfície "
                    "é exercitada e que decisão sustenta a ferramenta")
        elif tools[t][1] == "fundação":
            herdado = (fund_tools or {}).get(t)
            if herdado is None:
                rep.err(f"contract.md: '## {t}' herda da fundação, e a spec da fundação não tem linha para {t} "
                        f"em '{VERIFY_LABEL}'")
            elif herdado[1] == "pendente de ADR":
                rep.err(f"contract.md: '## {t}' herda da fundação uma superfície pendente de ADR; registre o "
                        "ADR com /adr-writer antes")
        if t == "Serviço" and not re.search(r"^Consumidor: \S", body, re.MULTILINE):
            rep.err("contract.md: '## Serviço' sem 'Consumidor: ...'; só existe com consumidor fora da feature")
        for h in re.findall(r"^### (.+)$", body, re.MULTILINE):
            if re.match(r"(GET|POST|PUT|PATCH|DELETE)\b|/", h.strip()) or re.search(r"\s/\S", h):
                rep.err(f"contract.md: subtítulo '### {h}' usa a entidade da superfície; use o nome da capacidade")
        parsed = parse_items(body)
        if not parsed:
            rep.err(f"contract.md: '## {t}' sem itens '#### ID'")
        for iid, cap, chunk in parsed:
            if not ITEM_ID.match(iid):
                rep.err(f"contract.md: ID '{iid}' fora do padrão SUPERFÍCIE-CAPACIDADE-NN")
            elif iid.split("-")[0] != SURFACE_CODE[t]:
                rep.err(f"contract.md: {iid} está em '## {t}', cujo código é {SURFACE_CODE[t]}")
            if iid in items:
                rep.err(f"contract.md: ID {iid} duplicado")
            if cap is None:
                rep.err(f"contract.md: {iid} fora de um '### Capacidade'")
            keys = re.findall(r"^- \*\*(Dado|Quando|Então|Notas):\*\*", chunk, re.MULTILINE)
            for k, line in re.findall(r"^- \*\*(Dado|Quando):\*\*(.*)$", chunk, re.MULTILINE):
                if NEEDS_REMOTE.search(line):
                    rep.err(f"contract.md: {iid} exige PR, push ou run da CI no {k}; todo item roda no ambiente "
                            "local, e a CI é conferida no Fechamento da /implement-and-evaluate")
                    break
            base = [k for k in keys if k != "Notas"]
            if base != ["Dado", "Quando", "Então"]:
                rep.err(f"contract.md: {iid} precisa de Dado, Quando e Então, uma vez cada e nessa ordem")
            then = re.search(r"^- \*\*Então:\*\*[^\n]*\n((?:[ \t]+- .*\n?)*)", chunk, re.MULTILINE)
            n = len(then.group(1).strip().splitlines()) if then and then.group(1).strip() else 0
            if "Então" in keys and n == 0:
                rep.err(f"contract.md: {iid} com Então sem observações em sub-bullets")
            elif n > 10:
                rep.err(f"contract.md: {iid} com {n} observações no Então (máximo 10; divida o item)")
            elif n > 5:
                rep.warn(f"contract.md: {iid} com {n} observações no Então (orçamento: até 5)")
            items[iid] = chunk

    # pré-requisitos
    pre = by.get("Pré-requisitos", "")
    subs = split_sections(pre, level=3)
    names = [s for s, _ in subs]
    for s in names:
        if s not in PREREQ_SUBS:
            rep.err(f"contract.md: subseção '### {s}' em Pré-requisitos não é uma das cinco fixas")
    if [s for s in names if s in PREREQ_SUBS] != [s for s in PREREQ_SUBS if s in names]:
        rep.err("contract.md: subseções de Pré-requisitos fora da ordem fixa")
    declared_paths = set()
    for s, body in subs:
        bl = [l[2:].strip() for l in body.splitlines() if l.startswith("- ")]
        if not bl:
            rep.err(f"contract.md: '### {s}' vazia; omita a subseção")
        for b in bl:
            for ref in ID_REF.findall(b.split("Usado por:")[-1]) if "Usado por:" in b else []:
                if ref not in items:
                    rep.err(f"contract.md: '{s}' cita {ref} em 'Usado por', que não existe")
            if s not in ("Estado persistido", "Entradas estáticas"):
                continue
            m = HANDLE_DECL.match(b)
            if not m:
                rep.err(f"contract.md: '{s}' fora do formato '- `handle`: descrição. Usado por: ID': '{b[:50]}'")
                continue
            handle, users = m.group(1), ID_REF.findall(m.group(3))
            looks_path = "/" in handle or re.search(r"\.[a-z0-9]{2,5}$", handle)
            if s == "Entradas estáticas" and "/" not in handle:
                rep.err(f"contract.md: entrada estática `{handle}` não é caminho de arquivo")
            if s == "Estado persistido" and looks_path:
                rep.err(f"contract.md: `{handle}` parece arquivo; arquivo é Entrada estática, não Estado persistido")
            if s == "Entradas estáticas":
                declared_paths.add(handle)
            if not users:
                rep.err(f"contract.md: `{handle}` sem item em 'Usado por'; declaração órfã")
            for u in users:
                if u in items and f"`{handle}`" not in items[u]:
                    rep.err(f"contract.md: `{handle}` lista {u} em 'Usado por', mas {u} não o cita")
    for iid, chunk in items.items():
        for tok in re.findall(r"`([^`\s]+)`", chunk):
            if "/" in tok and re.search(r"\.[a-z0-9]{2,5}$", tok) and not tok.startswith(("/", "http")) \
                    and tok not in declared_paths:
                rep.err(f"contract.md: {iid} cita o arquivo `{tok}` sem declará-lo em Entradas estáticas")

    # gates
    if "Gates de qualidade" in by:
        gbody = by["Gates de qualidade"]
        gates = [l[2:].strip() for l in gbody.splitlines() if l.startswith("- ")]
        if not gates:
            rep.err("contract.md: 'Gates de qualidade' sem gates; omita a seção")
        for g in gates:
            if not GATE.match(g):
                rep.err(f"contract.md: gate fora do formato '- **nome**: `comando`. descrição': '{g[:50]}'")
        intro = " ".join(l for l in gbody.splitlines() if l.strip() and not l.startswith("- "))
        if not intro:
            rep.err("contract.md: 'Gates de qualidade' sem o parágrafo de abertura")
        elif re.search(r"\bordem\b|primeiro erro|fail.?fast", intro, re.IGNORECASE):
            rep.err("contract.md: abertura dos gates prescreve execução; descreva só o que precisa passar")

    # manifesto
    if fund:
        scope = {norm_text(c): c for c in included}
        transversal = {}
    else:
        own = list(rf["criteria"]) if rf else []
        own += [it for a, b, it in prd["integration"] if b == rid]
        scope = {norm_text(c): c for c in own}
        transversal = {norm_text(c): c for c in prd["transversal"]}
    rows = table_rows(by.get("Manifesto de cobertura", ""))[1:]
    if "Manifesto de cobertura" in by and not rows:
        rep.err("contract.md: manifesto de cobertura sem linhas")
    covered = set()
    for r in rows:
        crit = norm_text(r[0]) if r else ""
        ids = ID_REF.findall(r[1]) if len(r) > 1 else []
        if crit in scope:
            covered.add(crit)
        elif crit not in transversal:
            origem = "um item de Incluído da spec" if fund else f"critério de {rid} ou de integração que termina nele"
            rep.err(f"contract.md: linha do manifesto não é texto literal de {origem}: '{r[0][:70]}'")
        if not ids:
            rep.err(f"contract.md: linha do manifesto sem item em 'Coberto por': '{r[0][:60]}'")
        for i in ids:
            if i not in items:
                rep.err(f"contract.md: manifesto cita {i}, que não existe")
    gaps = [scope[c] for c in scope if c not in covered]
    for g in gaps:
        rep.err(f"contract.md: lacuna de cobertura, critério sem linha com item no manifesto: \"{g}\"")

    # fecho de dependências
    if fund:
        allowed_rf, allowed_dep = set(), set()
    else:
        crf, cdep = closure(prd["rfs"], rid)
        allowed_rf, allowed_dep = set(crf) | {rid}, set(cdep)
    for ref in sorted(set(re.findall(r"\bRF-\d{3}\b", text)) - allowed_rf):
        rep.err(f"contract.md: cita {ref}, fora do fecho de dependências"
                f"{' (a fundação não depende de RF)' if fund else ''}; use o padrão de preparação")
    for ref in sorted(set(re.findall(r"\bDEP-\d+\b", text)) - allowed_dep):
        rep.err(f"contract.md: cita {ref}, fora do fecho de dependências")

    per_surface = {}
    for iid in items:
        per_surface[iid.split("-")[0]] = per_surface.get(iid.split("-")[0], 0) + 1
    return {"items": len(items), "per_surface": per_surface, "covered": len(covered), "scope": len(scope)}


# ---------- pasta ----------

def check_folder(folder, root, prd, hld, adrs, status):
    rep = Report(str(folder))
    name = folder.name
    rf = None
    if name == FUNDACAO:
        rid = FUNDACAO
        if not hld:
            rep.err("a fundação sai do HLD, e docs/architecture/hld.md não existe")
    else:
        m = re.fullmatch(r"(RF-\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)", name)
        if not m:
            rep.err(f"nome da pasta fora do padrão 'RF-NNN-nome-em-kebab' ou '{FUNDACAO}'")
            return rep, None
        rid = m.group(1)
        rf = prd["rfs"].get(rid)
        if rf is None:
            rep.err(f"{rid} não existe no PRD atual (saiu do PRD? a pasta virou histórico)")
            return rep, None
        if m.group(2) != slug(rf["name"]):
            rep.warn(f"pasta '{name}' não bate com o nome atual do RF; esperado {rid}-{slug(rf['name'])}")
        st = status.get(rid, ("",))[0]
        if st == "pendente":
            rep.warn(f"{rid} tem spec e continua 'pendente' no roadmap; rode roadmap.py set {rid} \"em andamento\"")
    ctx = {"rid": rid, "rf": rf, "prd": prd, "hld": hld}
    texts = {}
    for f in ("spec.md", "plan.md", "contract.md"):
        p = folder / f
        if not p.is_file():
            rep.err(f"{f} ausente; os três arquivos existem juntos ou nenhum")
        else:
            texts[f] = p.read_text(encoding="utf-8")
            check_common(rep, texts[f], f)
            check_adr_refs(rep, texts[f], f, adrs)
    summary = {"rid": rid}
    if "spec.md" in texts:
        summary.update(check_spec(rep, texts["spec.md"], ctx))
    if "plan.md" in texts:
        summary.update(check_plan(rep, texts["plan.md"], ctx, summary.get("complexity")))
    if "contract.md" in texts:
        fund_tools = None
        fund_spec = root / "docs" / "features" / FUNDACAO / "spec.md"
        if rid != FUNDACAO and fund_spec.is_file():
            fund_tools = verification_table(dict(split_sections(fund_spec.read_text(encoding="utf-8")))
                                            .get("Estratégia de testes", ""))
        summary.update(check_contract(rep, texts["contract.md"], ctx, summary.get("included", []),
                                      summary.get("tools", {}), fund_tools))
    return rep, summary


def main(argv):
    args = argv[1:]
    root = None
    if "--raiz" in args:
        i = args.index("--raiz")
        root = Path(args[i + 1])
        del args[i:i + 2]
    if len(args) != 1:
        print(__doc__)
        return 2
    target = Path(args[0])
    if not target.is_dir():
        print(f"pasta não encontrada: {target}")
        return 2
    is_feature = (target / "spec.md").exists() or (target / "contract.md").exists() or \
        re.match(r"RF-\d{3}-|fundacao$", target.name)
    folders = [target] if is_feature else sorted(p for p in target.iterdir() if p.is_dir())
    if root is None:
        base = target.resolve() if not is_feature else target.resolve().parent
        root = base.parent.parent  # docs/features -> raiz
    prd = read_prd(root)
    if prd is None:
        print(f"erro: {root / 'docs/product/prd.md'} não existe; a spec cobre critérios do PRD")
        return 1
    hld, adrs, status = read_hld(root), load_adrs(root), read_status(root)
    total_err = 0
    for folder in folders:
        rep, s = check_folder(folder, root, prd, hld, adrs, status)
        for w in rep.warnings:
            print(f"aviso: {folder.name}: {w}")
        for e in rep.errors:
            print(f"erro: {folder.name}: {e}")
        if s and "items" in s:
            surf = ", ".join(f"{k} {v}" for k, v in sorted(s["per_surface"].items()))
            print(f"{folder}: {s.get('complexity') or '?'}, {s.get('phases', 0)} fase(s) e {s.get('steps', 0)} "
                  f"passo(s); {s['items']} itens ({surf}); {s['covered']} de {s['scope']} critérios cobertos; "
                  f"{s.get('hyp', 0)} hipóteses; {s.get('pending', 0)} pendente(s) de ADR; "
                  f"{len(rep.errors)} erro(s), {len(rep.warnings)} aviso(s)")
        else:
            print(f"{folder}: {len(rep.errors)} erro(s), {len(rep.warnings)} aviso(s)")
        total_err += len(rep.errors)
    return 1 if total_err else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
