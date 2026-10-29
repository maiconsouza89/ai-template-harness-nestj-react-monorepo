#!/usr/bin/env python3
"""Extrai do PRD, do roadmap e do HLD o contexto de que a spec de um RF precisa.

Uso:
  python3 contexto.py rf RF-003      contexto completo de um RF (o que a spec e o contrato leem)
  python3 contexto.py onda 2         RFs da onda, com status, prioridade e pasta de spec
  python3 contexto.py estado         fundação, ondas e specs existentes, para decidir o que gerar

Opções: --raiz <dir> (padrão: diretório atual), que deve conter docs/product/prd.md.

O PRD é a fonte do RF, dos critérios e do 'Depende de'; as ondas são calculadas desses
blocos com o mesmo algoritmo do roadmap.py da prd-writer (copiado, não importado, para a
skill continuar autocontida); o status vem da tabela de ondas de docs/product/roadmap.md. O
fecho de dependências (o RF, suas dependências e as dependências delas) é o limite do que o
contrato pode exigir como pré-requisito. Saída determinística, só biblioteca padrão.
validate.py importa os parsers daqui.
"""
import re
import sys
import unicodedata
from pathlib import Path

sys.dont_write_bytecode = True  # não deixar __pycache__ dentro da skill

PRD_PATH = Path("docs/product/prd.md")
ROADMAP_PATH = Path("docs/product/roadmap.md")
HLD_PATH = Path("docs/architecture/hld.md")
ADR_DIR = Path("docs/architecture/adr")
FEATURES_DIR = Path("docs/features")
FUNDACAO = "fundacao"
# Scripts do contrato da stack (scripts/contract.sh). A fundação é quem os cria.
STACK_SCRIPTS = ("lint", "format", "test", "build")


def fail(msg):
    print(f"erro: {msg}")
    sys.exit(1)


# ---------- parsing do PRD (mesmo formato que a prd-writer valida) ----------

def norm_id(raw):
    """RF001, RF-001, rf001 -> RF-001; DEP1 -> DEP-1."""
    m = re.fullmatch(r"([A-Za-z]+)-?(\d+)", raw.strip())
    if not m:
        return raw.strip()
    prefix, num = m.group(1).upper(), m.group(2)
    return f"RF-{int(num):03d}" if prefix == "RF" else f"{prefix}-{int(num)}"


def split_sections(text, level=2):
    marks = "#" * level
    parts = re.split(rf"^{marks} (.+)$", text, flags=re.MULTILINE)
    return [(parts[i].strip(), parts[i + 1]) for i in range(1, len(parts), 2)]


def bullets_after(block, title):
    """Itens '- ...' logo abaixo de '**title**'; None se o bloco não existe."""
    m = re.search(rf"^\*\*{re.escape(title)}\*\*\n((?:- .*\n?)*)", block, re.MULTILINE)
    if not m:
        return None
    return [l[2:].strip() for l in m.group(1).strip().splitlines() if l.startswith("- ")]


DEPENDS_ITEM = re.compile(r"((?:RF|DEP)-?\d+)\s*\((\w+)\)\s*:\s*(\S.*)")
INTEGRATION_ITEM = re.compile(r"(RF-\d{3})\s*→\s*(RF-\d{3})\s*:\s*(\S.*)")


def parse_depends(block):
    out = []
    for item in bullets_after(block, "Depende de") or []:
        m = DEPENDS_ITEM.match(item)
        if m:
            out.append((norm_id(m.group(1)), m.group(2).lower(), m.group(3).strip()))
    return out


def read_prd(root):
    path = root / PRD_PATH
    if not path.is_file():
        return None
    text = path.read_text(encoding="utf-8")
    sections = dict(split_sections(text))
    version = re.search(r"^Versão: (\S+)", text, re.MULTILINE)
    title = re.search(r"^# PRD: (.+)$", text, re.MULTILINE)
    rfs = {}
    for b in re.split(r"^### ", sections.get("Requisitos funcionais", ""), flags=re.MULTILINE)[1:]:
        m = re.match(r"(RF-\d{3})\s+(.+)", b.splitlines()[0].strip())
        if not m:
            continue
        body = b.split("\n", 1)[1] if "\n" in b else ""
        body = re.sub(r"\n---\s*$", "", body.rstrip()).strip()
        prio = re.search(r"\*\*Prioridade:\*\*\s*(\S+)", b)
        rfs[m.group(1)] = {
            "id": m.group(1),
            "name": m.group(2).strip(),
            "block": body,
            "prio": (prio.group(1).lower().replace("média", "media") if prio else "baixa"),
            "depends": parse_depends(b),
            "criteria": bullets_after(b, "Critérios de aceitação") or [],
            "errors": bullets_after(b, "Erros previstos") or [],
        }
    deps = {}
    for b in re.split(r"^### ", sections.get("Dependências", ""), flags=re.MULTILINE)[1:]:
        head = b.splitlines()[0].strip()
        m = re.match(r"(DEP-?\d+)\s+([\wé-]+):\s*(\S.*)", head)
        if m:
            deps[norm_id(m.group(1))] = {"tipo": m.group(2).lower(), "title": m.group(3).strip(),
                                         "body": b.split("\n", 1)[1].strip() if "\n" in b else ""}
    integration, transversal = [], []
    crit = sections.get("Critérios de aceitação", "")
    sub = re.split(r"^(Integração entre requisitos|Transversais)\s*$", crit, flags=re.MULTILINE)
    for i in range(1, len(sub), 2):
        items = [l[2:].strip() for l in sub[i + 1].splitlines() if l.startswith("- ")]
        if sub[i].startswith("Integração"):
            for it in items:
                m = INTEGRATION_ITEM.match(it)
                if m:
                    integration.append((m.group(1), m.group(2), it))
        else:
            transversal = items
    return {
        "path": path,
        "title": title.group(1).strip() if title else "?",
        "version": version.group(1) if version else "?",
        "rfs": rfs,
        "deps": deps,
        "integration": integration,
        "transversal": transversal,
        "nfr": sections.get("Requisitos não funcionais", "").strip(),
        "decisions": sections.get("Decisões de produto e trade-offs", "").strip(),
    }


def compute_waves(rfs):
    """Onda 1: sem dependência de RF; onda n: todas as dependências em ondas menores."""
    pred = {r: {d for d, _, _ in rfs[r]["depends"] if d in rfs} for r in rfs}
    wave, pending, n = {}, set(rfs), 1
    while pending:
        ready = sorted(r for r in pending if pred[r] <= set(wave))
        if not ready:  # ciclo: o validate.py da prd-writer já reclama; aqui só não trava
            for r in sorted(pending):
                wave[r] = n
            break
        for r in ready:
            wave[r] = n
        pending -= set(ready)
        n += 1
    return wave


def closure(rfs, rid):
    """Fecho de dependências de um RF: (RFs, DEPs) alcançáveis pelos 'Depende de', sem o próprio."""
    seen_rf, seen_dep, stack = set(), set(), [rid]
    while stack:
        cur = stack.pop()
        for d, _, _ in rfs.get(cur, {}).get("depends", []):
            if d.startswith("DEP-"):
                seen_dep.add(d)
            elif d not in seen_rf and d != rid:
                seen_rf.add(d)
                stack.append(d)
    return sorted(seen_rf), sorted(seen_dep, key=lambda x: int(x.split("-")[1]))


def dependents(rfs, rid):
    return sorted(r for r in rfs if any(d == rid for d, _, _ in rfs[r]["depends"]))


def read_status(root):
    """{RF: (status, observação)} da tabela de ondas do roadmap; vazio se não há roadmap."""
    path = root / ROADMAP_PATH
    state = {}
    if not path.is_file():
        return state
    for line in path.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")] if line.startswith("|") else []
        if len(cells) >= 6 and re.fullmatch(r"RF-?\d+", cells[1]):
            state[norm_id(cells[1])] = (cells[4].lower(), cells[5])
    return state


def read_hld(root):
    path = root / HLD_PATH
    if not path.is_file():
        return None
    text = path.read_text(encoding="utf-8")
    sections = dict(split_sections(text))
    version = re.search(r"^Versão: (\S+)", text, re.MULTILINE)
    comps = []
    for line in sections.get("Componentes e responsabilidades", "").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")] if line.startswith("|") else []
        if cells and cells[0] not in ("Componente", "") and not set(cells[0]) <= set("-: "):
            comps.append(cells[0])
    trace = {}
    for line in sections.get("Rastreabilidade com o PRD", "").splitlines():
        m = re.match(r"\|\s*(RF-\d{3})[^|]*\|(.*)", line)
        if m:
            trace[m.group(1)] = line.strip()
    return {"path": path, "version": version.group(1) if version else "?", "components": comps, "trace": trace}


def slug(name):
    """Nome do RF para pasta: sem acento, minúsculas, hífen; '(hipótese)' e parênteses saem."""
    name = re.sub(r"\([^)]*\)", "", name)
    ascii_ = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", ascii_.lower()).strip("-")


def folder_for(rf):
    return FEATURES_DIR / f"{rf['id']}-{slug(rf['name'])}"


def existing_folder(root, rid):
    base = root / FEATURES_DIR
    if not base.is_dir():
        return None
    found = sorted(p for p in base.iterdir() if p.is_dir() and p.name.startswith(rid + "-"))
    return found[0] if found else None


def files_state(folder):
    if folder is None:
        return "sem spec"
    have = [f for f in ("spec.md", "plan.md", "contract.md") if (folder / f).is_file()]
    if len(have) == 3:
        return "spec completa"
    return f"spec incompleta ({', '.join(have) or 'pasta vazia'})"


def fundacao_state(root):
    """Sinais de que a fundação existe: a pasta de spec dela e os scripts do contrato da stack.

    Ter os scripts de lint/test/build é o sinal do harness de que a stack foi montada; o
    resto (esquema do banco, módulo de auth) é julgamento de quem lê o código.
    """
    scripts = [s for s in STACK_SCRIPTS if (root / "scripts" / f"{s}.sh").is_file()]
    spec = root / FEATURES_DIR / FUNDACAO
    return {"spec": files_state(spec if spec.is_dir() else None), "scripts": scripts}


# ---------- saída ----------

def integration_for(prd, rid):
    entrada = [it for a, b, it in prd["integration"] if b == rid]
    saida = [it for a, b, it in prd["integration"] if a == rid]
    return entrada, saida


def cmd_rf(root, prd, rid):
    rfs = prd["rfs"]
    if rid not in rfs:
        fail(f"{rid} não existe no PRD; RFs: {', '.join(sorted(rfs))}")
    rf = rfs[rid]
    waves = compute_waves(rfs)
    status = read_status(root)
    hld = read_hld(root)
    crf, cdep = closure(rfs, rid)
    entrada, saida = integration_for(prd, rid)
    folder = existing_folder(root, rid)
    out = [f"# Contexto: {rid} {rf['name']}", ""]
    out.append(f"- PRD: {PRD_PATH} versão {prd['version']}")
    out.append(f"- HLD: {HLD_PATH} versão {hld['version']}" if hld else "- HLD: não existe")
    out.append(f"- Onda: {waves[rid]}")
    out.append(f"- Prioridade: {rf['prio']}")
    out.append(f"- Status no roadmap: {status.get(rid, ('sem roadmap', ''))[0]}")
    out.append(f"- Pasta da spec: {folder_for(rf)}/")
    if folder and folder.name != folder_for(rf).name:
        out.append(f"- Pasta existente com outro nome: {folder.relative_to(root)}/ (o nome do RF mudou?)")
    out.append(f"- Estado da spec: {files_state(folder)}")
    out.append("")
    out.append("## Dependências diretas")
    if not rf["depends"]:
        out.append("- nenhuma")
    for d, lbl, what in rf["depends"]:
        st = status.get(d, ("", ""))[0] if d.startswith("RF-") else "externa"
        nome = rfs[d]["name"] if d in rfs else prd["deps"].get(d, {}).get("title", "?")
        out.append(f"- {d} {nome} ({lbl}, {st or 'sem status'}): {what}")
    out.append("")
    out.append("## Fecho de dependências (limite dos pré-requisitos do contrato)")
    out.append(f"- RFs: {', '.join(crf) or 'nenhum'}")
    out.append(f"- Externas: {', '.join(f'{d} {prd['deps'][d]['title']}' for d in cdep if d in prd['deps']) or 'nenhuma'}")
    nao_feitos = [d for d in crf if status.get(d, ("pendente",))[0] != "feito"]
    out.append(f"- Não feitos no roadmap: {', '.join(nao_feitos) or 'nenhum'}")
    out.append("")
    out.append("## Dependentes diretos (consomem o que este RF entrega)")
    out.append(f"- {', '.join(f'{d} {rfs[d]['name']}' for d in dependents(rfs, rid)) or 'nenhum'}")
    out.append("")
    out.append("## Bloco do RF no PRD")
    out.append(rf["block"])
    out.append("")
    out.append("## Critérios do manifesto de cobertura (texto literal)")
    out.append("Próprios do RF:")
    out += [f"- {c}" for c in rf["criteria"]] or ["- nenhum"]
    out.append(f"Integração em que {rid} é o destino (o teste cabe no fecho):")
    out += [f"- {c}" for c in entrada] or ["- nenhum"]
    out.append("")
    out.append(f"## Integração em que {rid} é a origem (fica no contrato do destino, não neste)")
    out += [f"- {c}" for c in saida] or ["- nenhum"]
    out.append("")
    out.append("## Rastreabilidade no HLD")
    if hld and rid in hld["trace"]:
        out.append(hld["trace"][rid])
    else:
        out.append("- sem linha para este RF" if hld else "- sem HLD")
    if hld:
        out.append(f"- Componentes do HLD: {', '.join(hld['components'])}")
    print("\n".join(out))


def cmd_onda(root, prd, n):
    rfs = prd["rfs"]
    waves = compute_waves(rfs)
    status = read_status(root)
    sel = [r for r in sorted(rfs) if waves[r] == n]
    if not sel:
        fail(f"onda {n} não existe; ondas: {', '.join(str(w) for w in sorted(set(waves.values())))}")
    print(f"# Onda {n}: {len(sel)} RF(s)\n")
    print("| RF | Nome | Prioridade | Status | Dependências não feitas | Spec |")
    print("| --- | --- | --- | --- | --- | --- |")
    for r in sel:
        crf, _ = closure(rfs, r)
        nf = [d for d in crf if status.get(d, ("pendente",))[0] != "feito"]
        print(f"| {r} | {rfs[r]['name']} | {rfs[r]['prio']} | {status.get(r, ('sem roadmap',))[0]} | "
              f"{', '.join(nf) or 'nenhuma'} | {files_state(existing_folder(root, r))} |")


def cmd_estado(root, prd):
    rfs = prd["rfs"]
    waves = compute_waves(rfs)
    status = read_status(root)
    hld = read_hld(root)
    fund = fundacao_state(root)
    print(f"# Estado: {prd['title']}\n")
    print(f"- PRD versão {prd['version']}, {len(rfs)} RFs em {max(waves.values()) if waves else 0} onda(s)")
    print(f"- HLD: {'versão ' + hld['version'] if hld else 'não existe'}")
    adrs = sorted((root / ADR_DIR).glob("[0-9][0-9][0-9][0-9]-*.md")) if (root / ADR_DIR).is_dir() else []
    print(f"- ADRs no acervo: {len(adrs)}")
    print(f"- Fundação: {fund['spec']}; scripts da stack presentes: {', '.join(fund['scripts']) or 'nenhum'}")
    for w in sorted(set(waves.values())):
        rs = [r for r in sorted(rfs) if waves[r] == w]
        print(f"- Onda {w}: " + ", ".join(
            f"{r} [{status.get(r, ('sem roadmap',))[0]}; {files_state(existing_folder(root, r))}]" for r in rs))


def main(argv):
    args = argv[1:]
    root = Path(".")
    if "--raiz" in args:
        i = args.index("--raiz")
        root = Path(args[i + 1])
        del args[i:i + 2]
    if not args or args[0] not in ("rf", "onda", "estado"):
        print(__doc__)
        return 2
    prd = read_prd(root)
    if prd is None:
        fail(f"{root / PRD_PATH} não existe; gere o PRD com /prd-writer antes da spec")
    if args[0] == "rf" and len(args) == 2:
        cmd_rf(root, prd, norm_id(args[1]))
    elif args[0] == "onda" and len(args) == 2 and args[1].isdigit():
        cmd_onda(root, prd, int(args[1]))
    elif args[0] == "estado":
        cmd_estado(root, prd)
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
