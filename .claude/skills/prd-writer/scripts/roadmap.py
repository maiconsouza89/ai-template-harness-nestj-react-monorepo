#!/usr/bin/env python3
"""Gera e atualiza o roadmap vivo (docs/product/roadmap.md) a partir do PRD.

Uso:
  python3 roadmap.py sync [--prd docs/product/prd.md]
  python3 roadmap.py set RF-003 "em andamento" [--motivo "..."] [--prd ...]

O PRD é a fonte do que existe e do que depende de quê (requisitos, prioridades e os blocos
'Depende de' de cada RF). O mapa de dependências e o paralelismo vivem só aqui: grafo,
ondas e caminho crítico são derivados desses blocos. O roadmap é também a fonte do
andamento: a coluna Status da tabela, que pessoas podem editar à mão. 'sync' regenera
grafo, ondas e situação preservando status e observações; RF novo entra como
pendente, RF que saiu do PRD vira removido e a linha fica como histórico. 'set' muda um
status e regenera. A saída não tem data: mesma entrada, mesmo arquivo.

Só biblioteca padrão. Valide o PRD com validate.py antes; aqui só se checa o necessário
para não gerar um roadmap errado.
"""
import argparse
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # não deixar __pycache__ dentro da skill
sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate import (  # noqa: E402
    RANK,
    norm_id,
    parse_dep_headings,
    parse_depends,
    parse_priority,
    rf_blocks,
    split_sections,
)

STATUSES = ["pendente", "em andamento", "feito", "bloqueado", "removido"]
# Cores legíveis em tema claro e escuro do GitHub; texto sempre explícito.
CLASSDEFS = {
    "pendente": "fill:#eceff1,stroke:#607d8b,color:#263238",
    "andamento": "fill:#fff3c4,stroke:#f9a825,color:#3e2723",
    "feito": "fill:#2e7d32,stroke:#1b5e20,color:#ffffff",
    "bloqueado": "fill:#c62828,stroke:#8e0000,color:#ffffff",
    "externa": "fill:#e3f2fd,stroke:#1565c0,color:#0d47a1",
}
CLASS_OF = {"pendente": "pendente", "em andamento": "andamento", "feito": "feito", "bloqueado": "bloqueado"}


def fail(msg):
    print(f"erro: {msg}")
    sys.exit(1)


def read_prd(path):
    text = path.read_text(encoding="utf-8")
    title = re.search(r"^# PRD: (.+)$", text, re.MULTILINE)
    version = re.search(r"^Versão: (\S+)", text, re.MULTILINE)
    sections = dict(split_sections(text))
    if "Requisitos funcionais" not in sections:
        fail(f"{path} sem 'Requisitos funcionais'; rode validate.py")
    # PRD de formato antigo geraria um roadmap sem arestas, com tudo na onda 1.
    if "Mapa de dependências e paralelismo" in sections or re.search(r"^\*\*Usa de\*\*", text, re.MULTILINE):
        fail(f"{path} no formato antigo (mapa no PRD ou 'Usa de'); migre para '**Depende de**' em cada RF")
    rfs, edges = {}, []
    for rid, name, block in rf_blocks(sections["Requisitos funcionais"]):
        if rid:
            rfs[rid] = {"name": name, "prio": parse_priority(block) or "baixa"}
            edges += [(a, lbl, rid) for a, lbl, _ in parse_depends(block) or [] if a]
    deps = {
        did: f"{did} {title}"
        for did, _, title, _ in parse_dep_headings(sections.get("Dependências", ""))
        if did
    }
    for a, _, b in edges:
        if a not in rfs and a not in deps:
            fail(f"{b} depende de {a}, que não existe no PRD; rode validate.py")
    return {
        "title": title.group(1).strip() if title else path.stem,
        "version": version.group(1) if version else "?",
        "rfs": rfs,
        "edges": edges,
        "deps": deps,
    }


def compute_waves(rfs, edges):
    """Onda 1 = sem predecessor RF; onda n = 1 + maior onda dos predecessores RF."""
    pred = {r: {a for a, _, b in edges if b == r and a in rfs} for r in rfs}
    waves, pending = {}, set(rfs)
    while pending:
        ready = [r for r in pending if pred[r] <= set(waves)]
        if not ready:
            fail(f"ciclo no mapa do PRD entre {', '.join(sorted(pending))}")
        for r in ready:
            waves[r] = 1 + max((waves[p] for p in pred[r]), default=0)
        pending -= set(ready)
    return waves, pred


def read_roadmap(path):
    """Linhas da tabela de ondas do roadmap atual: {RF: (status, observação)}."""
    state = {}
    if not path.is_file():
        return state
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 6 or not re.fullmatch(r"RF-?\d+", cells[1]):
            continue
        status = cells[4].lower()
        if status not in STATUSES:
            fail(f"{path}: {cells[1]} com status '{cells[4]}'; use {', '.join(STATUSES)}")
        state[norm_id(cells[1])] = (status, cells[5])
    return state


def merge(prd, old):
    rows = {}
    for rid in prd["rfs"]:
        status, obs = old.get(rid, ("pendente", ""))
        if status == "removido":  # voltou ao PRD: ciclo de vida recomeça
            status, obs = "pendente", ""
        rows[rid] = [status, obs]
    for rid, (status, obs) in old.items():
        if rid not in prd["rfs"]:
            rows[rid] = ["removido", obs if status == "removido" else (obs or f"saiu do PRD na versão {prd['version']}")]
    for rid, (status, obs) in rows.items():
        if status == "bloqueado" and not obs:
            fail(f"{rid} bloqueado sem motivo na coluna Observação")
    return rows


def critical_path(rfs, edges, rows):
    """Cadeia mais longa entre RFs ainda não feitos; desempate pelo menor número."""
    open_ = {r for r in rfs if rows[r][0] != "feito"}
    succ = {r: sorted(b for a, _, b in edges if a == r and b in open_) for r in open_}
    best = {}

    def longest(r):
        if r not in best:
            tails = [longest(s) for s in succ[r]]
            best[r] = [r] + (max(tails, key=len) if tails else [])
        return best[r]

    chains = [longest(r) for r in sorted(open_)]
    return max(chains, key=len) if chains else []


def node_id(n):
    return n.replace("-", "")


def quoted(text):
    return text.replace('"', "#quot;")


def render(prd, rows):
    rfs, edges = prd["rfs"], prd["edges"]
    waves, pred = compute_waves(rfs, edges)
    active = list(rfs)
    done = [r for r in active if rows[r][0] == "feito"]
    open_waves = [waves[r] for r in active if rows[r][0] != "feito"]
    released = [
        r for r in active
        if rows[r][0] == "pendente" and all(rows[p][0] == "feito" for p in pred[r])
    ]
    order = lambda r: (waves.get(r, 99), -RANK.get(rfs.get(r, {}).get("prio"), 0), r)
    released.sort(key=order)
    ext = {r: sorted(a for a, _, b in edges if b == r and a.startswith("DEP-")) for r in rfs}
    used_deps = sorted({a for a, _, _ in edges if a.startswith("DEP-")})

    out = [f"# Roadmap: {prd['title']}", ""]
    out.append(
        f"Gerado de `prd.md` versão {prd['version']} pela skill prd-writer. Status se muda na coluna "
        "Status da tabela de ondas (pendente, em andamento, feito, bloqueado, removido; bloqueado "
        "exige motivo em Observação). Grafo, ondas e situação são regenerados a partir dos blocos "
        "'Depende de' de cada RF no PRD; para mudar uma dependência, mude o PRD."
    )
    out += ["", "## Situação", ""]
    pct = round(100 * len(done) / len(active)) if active else 0
    out.append(f"- Concluídos: {len(done)} de {len(active)} RFs ({pct} por cento)")
    out.append(f"- Onda atual: {min(open_waves) if open_waves else 'todas concluídas'}")
    lib = [r + (f" (depende de {', '.join(ext[r])})" if ext[r] else "") for r in released]
    out.append(f"- Liberados para começar: {', '.join(lib) if lib else 'nenhum'}")
    for label, st in (("Em andamento", "em andamento"), ("Bloqueados", "bloqueado")):
        items = sorted((r for r in active if rows[r][0] == st), key=order)
        if st == "bloqueado":
            items = [f"{r} ({rows[r][1]})" for r in items]
        out.append(f"- {label}: {', '.join(items) if items else 'nenhum'}")
    cp = critical_path(rfs, edges, rows)
    out.append(f"- Caminho crítico restante: {' → '.join(cp) + f' ({len(cp)} RFs)' if cp else 'nenhum'}")

    out += ["", "## Grafo", "", "Aresta A → B: B não pode ser construído ou validado sem A.", "", "```mermaid", "graph LR"]
    for d in used_deps:
        out.append(f'  {node_id(d)}{{{{"{quoted(prd["deps"][d])}"}}}}:::externa')
    for r in sorted(rfs, key=order):
        out.append(f'  {node_id(r)}["{quoted(r + " " + rfs[r]["name"])}"]:::{CLASS_OF[rows[r][0]]}')
    for a, lbl, b in edges:
        out.append(f"  {node_id(a)} -->|{lbl}| {node_id(b)}" if lbl else f"  {node_id(a)} --> {node_id(b)}")
    for name, style in CLASSDEFS.items():
        out.append(f"  classDef {name} {style}")
    out += ["```", "", "Legenda: cinza pendente, amarelo em andamento, verde feito, vermelho bloqueado, azul dependência externa."]

    out += ["", "## Ondas", "", "RFs da mesma onda podem ser desenvolvidos em paralelo.", ""]
    out += [
        "| Onda | RF | Nome | Prioridade | Status | Observação | Depende de |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for r in sorted(rfs, key=order):
        before = sorted(a for a, _, b in edges if b == r)
        out.append(
            f"| {waves[r]} | {r} | {rfs[r]['name']} | {rfs[r]['prio']} | {rows[r][0]} | {rows[r][1]} "
            f"| {', '.join(before) if before else 'nenhum'} |"
        )
    for r in sorted(r for r in rows if r not in rfs):
        out.append(f"| - | {r} | - | - | removido | {rows[r][1]} | - |")
    if used_deps:
        out += ["", "Dependências externas no grafo"]
        out += [f"- {prd['deps'][d]}" for d in used_deps]
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--prd", default="docs/product/prd.md", help="caminho do PRD (o roadmap fica ao lado)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("sync", help="regenera o roadmap a partir do PRD, preservando status")
    st = sub.add_parser("set", help="muda o status de um RF e regenera")
    st.add_argument("rf")
    st.add_argument("status", choices=[s for s in STATUSES if s != "removido"])
    st.add_argument("--motivo", default="", help="obrigatório para bloqueado; vai para Observação")
    args = ap.parse_args()

    prd_path = Path(args.prd)
    if not prd_path.is_file():
        fail(f"PRD não encontrado: {prd_path}")
    road_path = prd_path.parent / "roadmap.md"
    prd = read_prd(prd_path)
    old = read_roadmap(road_path)

    if args.cmd == "set":
        rid = norm_id(args.rf)
        if rid not in prd["rfs"]:
            fail(f"{rid} não está no PRD atual")
        if args.status == "bloqueado" and not args.motivo:
            fail("bloqueado exige --motivo")
        prev_status, prev_obs = old.get(rid, ("pendente", ""))
        # Motivo de bloqueio não sobrevive ao desbloqueio; outras observações ficam.
        obs = args.motivo or ("" if prev_status == "bloqueado" else prev_obs)
        old[rid] = (args.status, obs)

    rows = merge(prd, old)
    _, pred = compute_waves(prd["rfs"], prd["edges"])
    for r in prd["rfs"]:
        if rows[r][0] == "feito":
            for p in sorted(pred[r]):
                if rows[p][0] != "feito":
                    print(f"aviso: {r} está {rows[r][0]}, mas depende de {p}, que está {rows[p][0]}")
    content = render(prd, rows)
    before = road_path.read_text(encoding="utf-8") if road_path.is_file() else None
    if content != before:
        road_path.write_text(content, encoding="utf-8")
    done = sum(1 for r in prd["rfs"] if rows[r][0] == "feito")
    state = "sem mudança" if content == before else ("criado" if before is None else "atualizado")
    print(f"{road_path}: {state}; {done} de {len(prd['rfs'])} RFs feitos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
