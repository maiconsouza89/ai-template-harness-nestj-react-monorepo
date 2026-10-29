#!/usr/bin/env python3
"""Valida a estrutura de um HLD gerado pela skill hld-writer.

Uso: python3 validate.py docs/architecture/hld.md [--prd docs/product/prd.md]

Checa o que é mecânico: seções obrigatórias na ordem do template, placeholders esquecidos,
componentes da tabela presentes no diagrama (e vice-versa), tecnologias sem decisão (ADR ou
pendência), interfaces sem protocolo ou exposição, metas sem número, riscos incompletos e RFs da
rastreabilidade que não existem no PRD. Cruza com o acervo de ADRs (docs/architecture/adr/*.md,
lido pelo front-matter, não pelo index.md): ADR citado que não existe, está superseded, rejected
ou deprecated é erro; proposed é aviso; tecnologia 'pendente de ADR' que já tem ADR aceito é
erro; ADR aceito que o HLD não cita é aviso. Compara a versão do PRD no cabeçalho com a do PRD
atual. Sai com código 1 quando há erro. Avisos não derrubam. Só biblioteca padrão.
"""
import re
import sys
from pathlib import Path

REQUIRED_SECTIONS = [
    "Objetivo técnico",
    "Arquitetura geral",
    "Componentes e responsabilidades",
    "Fluxos de requisição e de dados",
    "Modelo de dados (alto nível)",
    "Interfaces públicas",
    "Escalabilidade e disponibilidade",
    "Segurança",
    "Observabilidade",
    "Riscos arquiteturais e mitigação",
    "Rastreabilidade com o PRD",
    "ADRs e próximos passos",
]
PROBS = {"alta", "media", "média", "baixa"}
EXPOSURES = {"interna", "externa", "interna e externa"}
SECURITY_SUBS = ["Autenticação", "Autorização", "Proteção de dados", "Gestão de segredos"]
OBS_SUBS = ["Logs", "Métricas", "Tracing", "Dashboards e alertas"]
DATA_SUBS = ["Entidades principais", "Relações", "Fonte de verdade"]
ADR_REF = re.compile(r"ADR[- ]?(\d{4})", re.IGNORECASE)
# Mesmo padrão de nome e de front-matter do audit.py da adr-writer; copiado, não importado,
# para cada skill continuar autocontida.
ADR_FILE_RE = re.compile(r"^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$")
FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
ADR_FM_KEYS = ("status", "title", "description", "superseded_by")
# Palavras que aparecem em quase todo título de ADR e não identificam a tecnologia.
GENERIC_WORDS = {"plataforma", "servico", "serviço", "sistema", "banco", "ferramenta", "ferramentas", "provedor",
                 "linguagem", "framework", "cliente", "dados", "usar", "adotar", "motor", "padrao", "padrão",
                 "formato", "ambiente", "armazenamento", "cache", "fila", "mensageria", "streaming"}

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


# ---------- parsing helpers ----------

def split_sections(text):
    """Lista (titulo_h2, corpo) na ordem do arquivo. Ignora '## ' dentro de blocos de código."""
    text_nocode = re.sub(r"```.*?```", lambda m: m.group(0).replace("\n## ", "\n#_# "), text, flags=re.DOTALL)
    parts = re.split(r"^## (.+)$", text_nocode, flags=re.MULTILINE)
    out = []
    for i in range(1, len(parts), 2):
        out.append((parts[i].strip(), parts[i + 1].replace("\n#_# ", "\n## ")))
    return out


def table_rows(body):
    """Linhas de dados de todas as tabelas Markdown do corpo, como listas de células."""
    rows = []
    for line in body.splitlines():
        s = line.strip()
        if not s.startswith("|"):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", c) for c in cells if c):
            continue
        rows.append(cells)
    return rows


def tables(body):
    """Separa tabelas: lista de (header_cells, data_rows)."""
    out, cur_header, cur_rows, prev_blank = [], None, [], True
    for line in body.splitlines() + [""]:
        s = line.strip()
        if s.startswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            if all(re.fullmatch(r":?-{3,}:?", c) for c in cells if c):
                continue
            if cur_header is None:
                cur_header = cells
            else:
                cur_rows.append(cells)
        else:
            if cur_header is not None:
                out.append((cur_header, cur_rows))
            cur_header, cur_rows = None, []
    return out


def bullets_under(body, heading):
    """Itens '- ' logo abaixo de uma linha de subtítulo simples (sem #)."""
    m = re.search(rf"^{re.escape(heading)}\s*\n((?:[ \t]*- .*\n?)+)", body, re.MULTILINE)
    if not m:
        return []
    return [re.sub(r"^\s*- ", "", l).strip() for l in m.group(1).strip().splitlines()]


def h3_blocks(body):
    """Lista (titulo_h3, corpo)."""
    parts = re.split(r"^### (.+)$", body, flags=re.MULTILINE)
    return [(parts[i].strip(), parts[i + 1]) for i in range(1, len(parts), 2)]


def mermaid_blocks(body):
    return re.findall(r"```mermaid\n(.*?)```", body, re.DOTALL)


def mermaid_nodes(mer):
    """Nós declarados: id -> rótulo (ou id se sem rótulo)."""
    nodes = {}
    for line in mer.splitlines():
        s = line.strip()
        if not s or s.startswith(("graph", "flowchart", "%%", "subgraph", "end", "classDef", "class ", "style", "direction")):
            if s.startswith("subgraph"):
                pass
            continue
        for m in re.finditer(r"([A-Za-z_][\w-]*)\s*(\[\(|\[\[|\(\(|\{\{|\[|\(|\{|>)\s*\"?([^\]\)\}\"]*)\"?", s):
            nid, label = m.group(1), m.group(3).strip()
            nodes.setdefault(nid, label or nid)
        for m in re.finditer(r"(?:^|[\s>|])([A-Za-z_][\w-]*)(?=\s*(?:-->|---|-\.->|==>|$|[\s|]))", s):
            nodes.setdefault(m.group(1), m.group(1))
    return nodes


def norm(s):
    return re.sub(r"[^\w]+", " ", s.lower()).strip()


def load_adrs(adr_dir):
    """Front-matter de cada ADR do acervo: {"0007": {status, title, description, superseded_by}}.

    Lê os arquivos NNNN-*.md, e não o index.md, porque o índice é gerado e pode não existir ou
    estar desatualizado. Arquivo sem front-matter entra com campos vazios: o audit.py da
    adr-writer é quem reclama disso; aqui só precisamos saber que o número existe.
    """
    adrs = {}
    if not adr_dir or not adr_dir.is_dir():
        return adrs
    for p in sorted(adr_dir.glob("*.md")):
        m = ADR_FILE_RE.match(p.name)
        if not m:
            continue
        data = {k: "" for k in ADR_FM_KEYS}
        fm = FM_RE.match(p.read_text(encoding="utf-8"))
        if fm:
            for line in fm.group(1).splitlines():
                key, _, value = line.partition(":")
                key = key.strip().replace("-", "_")
                if key in data:
                    data[key] = value.strip().strip("\"'")
        adrs[m.group(1)] = data
    return adrs


# ---------- checks ----------

def check_header(text):
    if not re.search(r"^# HLD: \S", text, re.MULTILINE):
        err("título deve ser '# HLD: <nome do sistema ou módulo>'")
    for field in ("Versão:", "Data:", "Responsável:", "PRD:"):
        if not re.search(rf"^{field} \S", text, re.MULTILINE):
            err(f"cabeçalho sem '{field} ...'")
    m = re.search(r"^Data: (\S+)", text, re.MULTILINE)
    if m and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", m.group(1)):
        err(f"Data '{m.group(1)}' não está em AAAA-MM-DD")


def check_sections(sections):
    titles = [t for t, _ in sections]
    for s in REQUIRED_SECTIONS:
        if s not in titles:
            err(f"seção obrigatória ausente: '## {s}'")
    present = [s for s in REQUIRED_SECTIONS if s in titles]
    order = [t for t in titles if t in REQUIRED_SECTIONS]
    if order != present:
        err("seções obrigatórias fora da ordem do template")
    for t in titles:
        if t not in REQUIRED_SECTIONS:
            warn(f"seção fora do template: '## {t}'")


def check_placeholders(text):
    body = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    for m in re.finditer(r"\[([a-záéíóúâêôãõç][^\]\n]{2,})\](?!\()", body):
        inner = m.group(1)
        if inner.startswith(("RF-", "DEP-", "ADR-", "x")):
            continue
        err(f"placeholder não preenchido: [{inner[:40]}]")
    if "AAAA-MM-DD" in text:
        err("data do cabeçalho ainda é AAAA-MM-DD")
    for tag in ("ADR-NNNN", "RF-NNN"):
        if tag in body:
            err(f"placeholder não preenchido: {tag} (se for prosa, como 'trocados pelos RF-NNN', "
                "escreva 'pelos números do PRD'; o validador não distingue prosa de placeholder)")


def check_objective(body):
    for sub in ("Problemas técnicos endereçados", "Sistemas e módulos conectados"):
        if not bullets_under(body, sub):
            err(f"objetivo técnico sem '{sub}' com itens")


def check_architecture(body):
    mers = mermaid_blocks(body)
    if not mers:
        err("arquitetura geral sem bloco ```mermaid com o diagrama de componentes")
        nodes = {}
    else:
        mer = mers[0]
        if not re.search(r"^\s*(graph|flowchart)\s+(LR|TD|TB|RL|BT)", mer, re.MULTILINE):
            err("diagrama de componentes deve começar com 'graph LR' (ou flowchart)")
        nodes = mermaid_nodes(mer)
        if len(nodes) < 2:
            err("diagrama de componentes com menos de 2 nós")
    if not bullets_under(body, "Ambiente de implantação"):
        err("arquitetura geral sem 'Ambiente de implantação' com itens")
    if not bullets_under(body, "Padrões adotados"):
        err("arquitetura geral sem 'Padrões adotados' com itens")
    techs, pending = [], []
    tech_tables = [t for t in tables(body) if t[0] and norm(t[0][0]).startswith("tecnologia")]
    if not tech_tables:
        err("arquitetura geral sem tabela 'Tecnologia | Papel | Decisão'")
    else:
        header, rows = tech_tables[0]
        if len(header) < 3 or norm(header[2]) != "decisão":
            err("tabela de tecnologias deve ter colunas Tecnologia | Papel | Decisão")
        if not rows:
            err("tabela de tecnologias sem linhas")
        for r in rows:
            if len(r) < 3 or any(not c for c in r[:3]):
                err(f"tecnologia incompleta (tecnologia, papel, decisão): {' | '.join(r)[:60]}")
                continue
            tech, role, decision = r[0], r[1], r[2]
            adrs = ADR_REF.findall(decision)
            is_pending = "pendente" in decision.lower()
            if not adrs and not is_pending:
                err(f"tecnologia '{tech}' sem decisão: cite ADR-NNNN ou 'pendente de ADR'")
            if is_pending:
                pending.append(tech)
            techs.append({"name": tech, "role": role, "decision": decision, "adrs": [f"ADR-{a}" for a in adrs]})
    return nodes, techs, pending


def check_components(body, diagram_nodes):
    comps = []
    tbls = tables(body)
    if not tbls or not tbls[0][1]:
        err("componentes: tabela 'Componente | Responsabilidades | Dependências' ausente ou vazia")
        return comps
    header, rows = tbls[0]
    if len(header) < 3:
        err("tabela de componentes deve ter colunas Componente | Responsabilidades | Dependências")
    for r in rows:
        if len(r) < 3 or any(not c for c in r[:3]):
            err(f"componente incompleto: {' | '.join(r)[:60]}")
            continue
        comps.append({"name": r[0], "responsibilities": r[1], "dependencies": r[2]})
    n = len(comps)
    if n > 12:
        warn(f"{n} componentes; acima de 12 costuma ser mais de um sistema")
    if n and n < 3:
        warn(f"{n} componente(s); abaixo de 3 raramente precisa de HLD")
    if diagram_nodes:
        labels = {norm(v) for v in diagram_nodes.values()} | {norm(k) for k in diagram_nodes}
        for c in comps:
            if norm(c["name"]) not in labels:
                err(f"componente '{c["name"]}' da tabela não aparece no diagrama (use o mesmo nome no rótulo do nó)")
    return comps


def check_flows(body, comp_names):
    flows = h3_blocks(body)
    if not flows:
        err("fluxos: nenhum '### Fluxo: <nome>'")
    out = []
    for title, b in flows:
        if not title.lower().startswith("fluxo"):
            warn(f"subtítulo de fluxo fora do padrão '### Fluxo: <nome>': '{title[:40]}'")
        steps = [l for l in b.splitlines() if re.match(r"^\s*- ", l)]
        steps = [re.sub(r"^\s*- ", "", s).strip() for s in steps]
        # corta ao chegar em subtítulo simples (Fluxo de dados etc.) que pertence ao fim da seção
        cut = re.search(r"^(Fluxo de dados|Persistência e replicação)\s*$", b, re.MULTILINE)
        if cut:
            steps = [re.sub(r"^\s*- ", "", l).strip() for l in b[: cut.start()].splitlines() if re.match(r"^\s*- ", l)]
        if len(steps) < 3:
            err(f"fluxo '{title[:40]}' com {len(steps)} passo(s); mínimo 3")
        elif len(steps) > 8:
            warn(f"fluxo '{title[:40]}' com {len(steps)} passos (orçamento: 3 a 8)")
        out.append({"name": re.sub(r"^fluxo:\s*", "", title, flags=re.IGNORECASE), "steps": steps})
    if len(out) > 5:
        warn(f"{len(out)} fluxos; orçamento é 2 a 5")
    data_flow = bullets_under(body, "Fluxo de dados")
    if not data_flow:
        err("fluxos sem 'Fluxo de dados' com itens")
    persistence = bullets_under(body, "Persistência e replicação")
    if not persistence:
        err("fluxos sem 'Persistência e replicação' com itens")
    return out, data_flow, persistence


def check_data_model(body):
    out = {}
    for sub in DATA_SUBS:
        items = bullets_under(body, sub)
        if not items:
            err(f"modelo de dados sem '{sub}' com itens")
        out[sub] = items
    out["Sincronização e cache"] = bullets_under(body, "Sincronização e cache")
    out["Versionamento e retenção"] = bullets_under(body, "Versionamento e retenção")
    n = len(out["Entidades principais"])
    if n > 10:
        warn(f"{n} entidades; o esquema completo é do código, orçamento 4 a 10")
    return out


def check_interfaces(body):
    out = []
    tbls = tables(body)
    if not tbls or not tbls[0][1]:
        err("interfaces: tabela ausente ou vazia")
        return out
    header, rows = tbls[0]
    if len(header) < 5:
        err("tabela de interfaces deve ter colunas Nome | Tipo | Protocolo | Exposição | SLA e limites")
    for r in rows:
        if len(r) < 5 or any(not c for c in r[:5]):
            err(f"interface incompleta: {' | '.join(r)[:60]}")
            continue
        name, kind, proto, expo, sla = r[:5]
        if expo.lower().strip() not in EXPOSURES:
            err(f"interface '{name}' com exposição '{expo}' (use interna ou externa)")
        if not re.search(r"\d", sla):
            warn(f"interface '{name}' com SLA sem número: '{sla[:40]}'")
        out.append({"name": name, "kind": kind, "protocol": proto, "exposure": expo, "sla_limits": sla})
    return out


def check_scalability(body):
    out = {}
    for sub in ("Abordagem geral", "Técnicas aplicadas", "Metas"):
        items = bullets_under(body, sub)
        if not items:
            err(f"escalabilidade sem '{sub}' com itens")
        out[sub] = items
    metas = " ".join(out.get("Metas", []))
    if "disponibilidade" not in metas.lower():
        err("metas sem linha de 'Disponibilidade'")
    elif not re.search(r"\d", metas):
        err("metas de disponibilidade sem número")
    if not re.search(r"\bRTO\b|\bRPO\b|recupera", metas, re.IGNORECASE):
        warn("metas sem RTO/RPO ou recuperação de falhas")
    return out


def check_subsections(body, subs, section):
    out = {}
    for sub in subs:
        items = bullets_under(body, sub)
        if not items:
            err(f"{section} sem '{sub}' com itens")
        out[sub] = items
    return out


def check_risks(body):
    out = []
    blocks = h3_blocks(body)
    if not blocks:
        warn("nenhum risco listado")
    for name, b in blocks:
        risk = {"risk": name}
        for field in ("Probabilidade", "Impacto", "Mitigação", "Plano de contingência"):
            if f"**{field}:**" not in b:
                err(f"risco '{name[:50]}' sem '**{field}:**'")
        pm = re.search(r"\*\*Probabilidade:\*\*\s*(\S+)", b)
        if pm:
            p = pm.group(1).lower().strip("*")
            if p not in PROBS:
                err(f"risco '{name[:50]}' com probabilidade inválida '{p}'")
            risk["probability"] = {"alta": "high", "media": "medium", "média": "medium", "baixa": "low"}.get(p, p)
        im = re.search(r"\*\*Impacto:\*\*\s*(.+)", b)
        if im:
            risk["impact"] = im.group(1).strip()
        mm = re.search(r"\*\*Mitigação:\*\*\n((?:\s+- .*\n?)+)", b)
        if "**Mitigação:**" in b and not mm:
            err(f"risco '{name[:50]}': mitigação deve ser lista de subitens")
        if mm:
            risk["mitigation"] = [re.sub(r"^\s*- ", "", l).strip() for l in mm.group(1).strip().splitlines()]
        cm = re.search(r"\*\*Plano de contingência:\*\*\s*(.+)", b)
        if cm:
            risk["contingency_plan"] = cm.group(1).strip()
        out.append(risk)
    return out


def check_traceability(body, header_prd, prd_path, comp_names, interface_names):
    rows = []
    tbls = tables(body)
    no_prd = re.search(r"não há PRD", body + " " + header_prd, re.IGNORECASE)
    if tbls and tbls[0][1]:
        for r in tbls[0][1]:
            if len(r) < 4:
                err(f"rastreabilidade: linha incompleta '{' | '.join(r)[:50]}'")
                continue
            if not re.match(r"(RF-\d{3}|RB-\d{2})\b", r[0]):
                warn(f"rastreabilidade: requisito '{r[0][:30]}' fora do padrão RF-NNN (PRD) ou RB-NN (brief)")
            rows.append({"requirement": r[0], "components": r[1], "interfaces": r[2], "flow": r[3]})
    elif not no_prd:
        err("rastreabilidade sem tabela e sem a linha 'não há PRD'")
    hld_rfs = {re.sub(r"RF-?(\d+)", lambda m: f"RF-{int(m.group(1)):03d}", x) for x in re.findall(r"RF-?\d{3}", body)}
    nfr = bullets_under(body, "Requisitos não funcionais do PRD")
    if rows and not nfr:
        warn("rastreabilidade sem 'Requisitos não funcionais do PRD' com itens")
    if prd_path and prd_path.is_file():
        prd = prd_path.read_text(encoding="utf-8")
        prd_rfs = set(re.findall(r"^### (RF-\d{3})", prd, re.MULTILINE))
        for rf in sorted(prd_rfs - hld_rfs):
            err(f"{rf} existe no PRD mas não aparece na rastreabilidade")
        for rf in sorted(hld_rfs - prd_rfs):
            err(f"{rf} citado na rastreabilidade não existe no PRD")
        # O HLD foi escrito contra uma versão do PRD; quando o PRD sobe, a rastreabilidade e as
        # metas podem ter envelhecido. Aviso, não erro: cabe a quem lê decidir se algo mudou.
        hld_ver = re.search(r"vers[aã]o\s+(\d+\.\d+\.\d+)", header_prd, re.IGNORECASE)
        prd_ver = re.search(r"^Versão:\s*(\d+\.\d+\.\d+)", prd, re.MULTILINE)
        if hld_ver and prd_ver and hld_ver.group(1) != prd_ver.group(1):
            warn(f"HLD escrito contra o PRD {hld_ver.group(1)}; PRD atual é {prd_ver.group(1)}: "
                 "revise rastreabilidade e metas")
        elif prd_ver and not hld_ver:
            warn("cabeçalho 'PRD:' sem a versão do PRD (ex: 'docs/product/prd.md versão 0.1.0')")
    elif rows and not no_prd:
        warn("PRD não encontrado para cruzar os RFs (use --prd <caminho>)")
    for row in rows:
        for c in [x.strip() for x in re.split(r"[,;]", row["components"]) if x.strip()]:
            if comp_names and norm(c) not in {norm(n) for n in comp_names} and c.lower() not in ("nenhum", "n/a"):
                warn(f"rastreabilidade de {row['requirement']} cita componente '{c}' que não está na tabela de componentes")
    return rows, nfr


def check_adrs(body, techs_all, adr_dir, acervo, full_text):
    techs_pending = [t["name"] for t in techs_all if "pendente" in t["decision"].lower()]
    assoc = bullets_under(body, "ADRs associados")
    pending = bullets_under(body, "Decisões pendentes de ADR")
    steps = bullets_under(body, "Próximos passos")
    if not steps:
        err("ADRs e próximos passos sem 'Próximos passos' com itens")
    if not assoc and not pending:
        err("ADRs e próximos passos sem 'ADRs associados' nem 'Decisões pendentes de ADR'")
    pend_text = " ".join(pending).lower()
    for tech in techs_pending:
        if norm(tech) not in norm(pend_text):
            err(f"tecnologia '{tech}' está 'pendente de ADR' mas não aparece em 'Decisões pendentes de ADR'")
    if not (adr_dir and adr_dir.is_dir()):
        return assoc, pending, steps

    # Citação vigente é o primeiro ADR da célula Decisão de cada tecnologia e o primeiro de cada
    # item de "ADRs associados": esses precisam existir e ainda valer, e um superseded aponta
    # para o sucessor, que é quem o HLD deve citar. Mencionar o ADR antigo em prosa ("substitui o
    # ADR-0003") é histórico legítimo e só gera aviso, para o leitor confirmar que é só isso.
    decisive = set()
    for tech in techs_all:
        found = ADR_REF.findall(tech["decision"])
        if found:
            decisive.add(found[0])
    for item in assoc:
        found = ADR_REF.findall(item)
        if found:
            decisive.add(found[0])
    mentioned = set(ADR_REF.findall(full_text))
    for num in sorted(mentioned):
        adr = acervo.get(num)
        if adr is None:
            err(f"ADR-{num} citado não existe em {adr_dir}")
            continue
        status = adr["status"]
        if num in decisive:
            if status == "superseded":
                succ = f": cite ADR-{adr['superseded_by']}" if adr["superseded_by"] else ""
                err(f"ADR-{num} está superseded{succ}")
            elif status in ("rejected", "deprecated"):
                err(f"ADR-{num} está {status} e não sustenta decisão do HLD")
            elif status == "proposed":
                warn(f"ADR-{num} ainda está proposed: decisão em discussão; cite como 'ADR-{num} (proposed)' até ser aceito")
        elif status in ("superseded", "rejected", "deprecated"):
            warn(f"ADR-{num} ({status}) é mencionado no texto; confirme que é só histórico e que a decisão vigente cita o sucessor")
    cited = mentioned

    # Tecnologia pendente que o acervo já decidiu: o HLD deve citar o ADR, não reabrir a decisão.
    accepted = {n: a for n, a in acervo.items() if a["status"] == "accepted"}
    for tech in techs_pending:
        t = norm(tech)
        for num, adr in accepted.items():
            text = norm(adr["title"] + " " + adr["description"])
            if t and t in text:
                err(f"tecnologia '{tech}' está 'pendente de ADR' mas ADR-{num} aceito já decide isso: '{adr['title']}'")
                break
            # Nome composto ("Fila (RabbitMQ)") contra título curto: um token longo em comum é só suspeita.
            # Palavras genéricas de título ("plataforma", "serviço") não contam, senão tudo casa com tudo.
            toks = [tok for tok in t.split() if len(tok) >= 5 and tok not in GENERIC_WORDS]
            if any(tok in norm(adr["title"]).split() for tok in toks):
                warn(f"tecnologia '{tech}' pendente parece coberta por ADR-{num} aceito: '{adr['title']}'")
                break

    # ADR aceito que o HLD ignora pode ser escopo de outro sistema; quem lê decide. ADR sobre o
    # próprio processo de decisão (o 0001 "Usar ADRs...") nunca entra num HLD e não gera aviso.
    for num in sorted(set(accepted) - cited):
        if re.search(r"\badrs?\b", accepted[num]["title"], re.IGNORECASE):
            continue
        warn(f"ADR-{num} aceito ('{accepted[num]['title']}') não é citado no HLD; confirme se está fora do escopo")
    return assoc, pending, steps


def check_style(text):
    if "—" in text:
        warn(f"{text.count('—')} travessão(ões) '—' no texto; a regra do HLD é não usar")
    hyp = len(re.findall(r"\(hipótese\)", text))
    if hyp > 30:
        warn(f"{hyp} hipóteses; acima de 30 o documento está desenhando demais pelo usuário "
             "(a mesma hipótese marcada em várias seções conta várias vezes: uma marca por decisão)")
    variants = re.findall(r"\(hipótese[:,]? [^)]{1,60}\)", text)
    if variants:
        warn(f"{len(variants)} marca(s) na forma '(hipótese ...)', ex.: {variants[0]!r}; "
             "use a forma literal '(hipótese)' no fim da linha, que é a que o validador conta")
    lines = text.count("\n")
    if lines > 600:
        warn(f"{lines} linhas; orçamento do HLD é 250 a 600")
    return hyp


# ---------- main ----------

def main(argv):
    args = [a for a in argv[1:]]
    prd_arg = None
    if "--prd" in args:
        i = args.index("--prd")
        prd_arg = Path(args[i + 1]) if i + 1 < len(args) else None
        del args[i : i + 2]
    if len(args) != 1:
        print(__doc__)
        return 2
    path = Path(args[0])
    if not path.is_file():
        print(f"arquivo não encontrado: {path}")
        return 2
    text = path.read_text(encoding="utf-8")
    # Layout padrão: docs/architecture/{hld.md, adr/} e docs/product/prd.md.
    arch_dir = path.resolve().parent
    prd_path = prd_arg or (arch_dir.parent / "product" / "prd.md")
    adr_dir = arch_dir / "adr"

    check_header(text)
    sections = split_sections(text)
    check_sections(sections)
    check_placeholders(text)
    by = dict(sections)
    header_prd = (re.search(r"^PRD: (.+)$", text, re.MULTILINE) or [None, ""])[1]

    data = {"techs": [], "components": [], "flows": [], "data_flow": [], "persistence": [], "data_model": {},
            "interfaces": [], "scalability": {}, "security": {}, "observability": {}, "risks": [],
            "trace_rows": [], "trace_nfr": [], "adrs": [], "pending": [], "steps": []}
    nodes, pending_techs = {}, []
    if "Objetivo técnico" in by:
        check_objective(by["Objetivo técnico"])
    if "Arquitetura geral" in by:
        nodes, data["techs"], pending_techs = check_architecture(by["Arquitetura geral"])
    if "Componentes e responsabilidades" in by:
        data["components"] = check_components(by["Componentes e responsabilidades"], nodes)
    comp_names = [c["name"] for c in data["components"]]
    if "Fluxos de requisição e de dados" in by:
        data["flows"], data["data_flow"], data["persistence"] = check_flows(by["Fluxos de requisição e de dados"], comp_names)
    if "Modelo de dados (alto nível)" in by:
        data["data_model"] = check_data_model(by["Modelo de dados (alto nível)"])
    if "Interfaces públicas" in by:
        data["interfaces"] = check_interfaces(by["Interfaces públicas"])
    if "Escalabilidade e disponibilidade" in by:
        data["scalability"] = check_scalability(by["Escalabilidade e disponibilidade"])
    if "Segurança" in by:
        data["security"] = check_subsections(by["Segurança"], SECURITY_SUBS, "segurança")
    if "Observabilidade" in by:
        data["observability"] = check_subsections(by["Observabilidade"], OBS_SUBS, "observabilidade")
    if "Riscos arquiteturais e mitigação" in by:
        data["risks"] = check_risks(by["Riscos arquiteturais e mitigação"])
    if "Rastreabilidade com o PRD" in by:
        data["trace_rows"], data["trace_nfr"] = check_traceability(
            by["Rastreabilidade com o PRD"], header_prd, prd_path, comp_names, [i["name"] for i in data["interfaces"]])
    acervo = load_adrs(adr_dir)
    if "ADRs e próximos passos" in by:
        data["adrs"], data["pending"], data["steps"] = check_adrs(
            by["ADRs e próximos passos"], data["techs"], adr_dir, acervo, text)
    hyp = check_style(text)

    for w in warnings:
        print(f"aviso: {w}")
    for e in errors:
        print(f"erro: {e}")
    print(f"{path}: {len(data['components'])} componentes, {len(data['interfaces'])} interfaces, "
          f"{len(data['flows'])} fluxos, {len(acervo)} ADR(s) no acervo, "
          f"{len(pending_techs)} tecnologia(s) pendente(s) de ADR, "
          f"{hyp} hipóteses, {len(errors)} erro(s), {len(warnings)} aviso(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
