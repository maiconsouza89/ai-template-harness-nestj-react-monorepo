#!/usr/bin/env python3
"""Valida os registros de avaliação em docs/features: avaliacao.md e orquestracao.md.

Uso:
  python3 validate.py docs/features                         (todas as pastas)
  python3 validate.py docs/features/RF-002-cadastrar-tela   (uma pasta)
Opções: --raiz <dir> (padrão: diretório atual, a raiz do repositório).

avaliacao.md (skill evaluator): cabeçalho com Execução, Branch, Commit, Status, Itens e
Critérios; seções fixas na ordem; status conhecido e coerente com a tabela de critérios
(limpo só com tudo verificado, reprovado com pelo menos um reprovado); cada item com Veredito
conhecido, e cada item falhou ou bloqueado com o Dono que resolve (código, contrato, decisão
ou ambiente), que a implement-and-evaluate usa para decidir se despacha a fix-runner; sem
travessão.
Avisa quando os critérios da avaliação não batem com o manifesto do contract.md atual, ou
seja, quando a avaliação ficou para trás do contrato.

orquestracao.md (skill implement-and-evaluate): título e linha de Status conhecida.

Cruza com docs/product/roadmap.md: RF 'feito' com avaliação que não é 'limpo' é erro; RF
'feito' sem avaliacao.md é aviso (pode ter sido marcado à mão).

Sai com código 1 quando há erro; avisos não derrubam. Só biblioteca padrão.
"""
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True

ROADMAP = Path("docs/product/roadmap.md")
HEADER = ["Execução", "Branch", "Commit", "Status", "Itens", "Critérios"]
SECTIONS = ["Critérios", "Gates de qualidade", "Pré-requisitos", "Itens", "Descoberta",
            "Limpeza e ambiente", "Avisos"]
STATUS = re.compile(r"^(limpo|reprovado|pendente|reprovado no gate .+|abortado no passo \d+|abortado no item \S+: .+)$")
RESULT = {"✓ verificado": "v", "✗ reprovado": "x", "⊘ indeterminado": "u"}
ORQ_STATUS = re.compile(r"^(em execução|sucesso|manual pendente|precisa de decisão|travado|esgotado|abortado|pr bloqueado)$")
VERDICTS = {"passou", "falhou", "bloqueado", "manual", "pulado"}
OWNERS = {"código", "contrato", "decisão", "ambiente"}


class Report:
    def __init__(self):
        self.errors, self.warnings = 0, 0

    def err(self, where, msg):
        self.errors += 1
        print(f"erro: {where}: {msg}")

    def warn(self, where, msg):
        self.warnings += 1
        print(f"aviso: {where}: {msg}")


def sections(text):
    out, cur = {}, None
    for line in text.splitlines():
        if line.startswith("## "):
            cur = line[3:].strip()
            out[cur] = []
        elif cur is not None:
            out[cur].append(line)
    return {k: "\n".join(v) for k, v in out.items()}


def table_rows(block):
    rows = []
    for ln in block.splitlines():
        if ln.startswith("|") and not re.match(r"^\|\s*-", ln):
            rows.append([c.strip() for c in ln.strip().strip("|").split("|")])
    return rows[1:] if rows else []


def manifest(contract):
    rows = table_rows(sections(contract).get("Manifesto de cobertura", ""))
    return {r[0] for r in rows if r and r[0]}


def roadmap_status(root):
    path = root / ROADMAP
    state = {}
    if path.is_file():
        for line in path.read_text(encoding="utf-8").splitlines():
            cells = [c.strip() for c in line.strip().strip("|").split("|")] if line.startswith("|") else []
            if len(cells) >= 5 and re.fullmatch(r"RF-\d{3}", cells[1]):
                state[cells[1]] = cells[4].lower()
    return state


def check_avaliacao(rep, folder, root):
    path = folder / "avaliacao.md"
    where = str(path.relative_to(root))
    text = path.read_text(encoding="utf-8")
    if "—" in text:
        rep.err(where, "travessão '—'; use dois-pontos, vírgula ou ponto")
    if "<!--" in text:
        rep.err(where, "comentário HTML")
    if not re.search(r"^# Avaliação: .+$", text, re.M):
        rep.err(where, "falta o título '# Avaliação: <RF-NNN Nome | fundação>'")
    head = {}
    for key in HEADER:
        m = re.search(rf"^- {key}: (.+)$", text, re.M)
        if m:
            head[key] = m.group(1).strip()
        else:
            rep.err(where, f"falta a linha '- {key}: ...' no cabeçalho")
    sec = sections(text)
    order = [s for s in sec if s in SECTIONS]
    for s in SECTIONS:
        if s not in sec:
            rep.err(where, f"falta a seção '## {s}'")
    if order != [s for s in SECTIONS if s in sec]:
        rep.err(where, f"seções fora da ordem; esperado: {', '.join(SECTIONS)}")
    status = head.get("Status", "")
    if status and not STATUS.match(status):
        rep.err(where, f"status desconhecido '{status}'")
    if (status.startswith("abortado") or status.startswith("reprovado no gate")) and "Motivo do aborto" not in sec:
        rep.err(where, f"status '{status}' exige a seção '## Motivo do aborto'")

    rows = table_rows(sec.get("Critérios", ""))
    marks = []
    for r in rows:
        if len(r) < 3:
            rep.err(where, f"linha de critério com menos de 3 colunas: {' | '.join(r)}")
            continue
        mark = RESULT.get(r[1])
        if mark is None:
            rep.err(where, f"resultado '{r[1]}' desconhecido; use {', '.join(RESULT)}")
        marks.append(mark)
    if not rows:
        rep.err(where, "tabela de critérios vazia")
    if status == "limpo" and any(m != "v" for m in marks):
        rep.err(where, "status 'limpo' com critério que não está verificado")
    if status == "reprovado" and "x" not in marks:
        rep.err(where, "status 'reprovado' sem nenhum critério reprovado")
    if status == "pendente" and ("x" in marks or "u" not in marks):
        rep.err(where, "status 'pendente' exige nenhum reprovado e pelo menos um indeterminado")

    check_itens(rep, where, sec.get("Itens", ""))

    contract = folder / "contract.md"
    if contract.is_file() and rows:
        atual = manifest(contract.read_text(encoding="utf-8"))
        avaliado = {r[0] for r in rows}
        if atual and atual != avaliado:
            rep.warn(where, "os critérios avaliados não batem com o manifesto atual do contrato; "
                            "a avaliação ficou para trás, rode /evaluator de novo")
    return status


def check_itens(rep, where, block):
    for chunk in re.split(r"^(?=#### )", block, flags=re.M):
        if not chunk.startswith("#### "):
            continue
        iid = chunk.splitlines()[0][5:].strip().rstrip("*").strip()
        m = re.search(r"^- Veredito: (.+)$", chunk, re.M)
        if not m:
            rep.err(where, f"{iid} sem a linha '- Veredito: ...'")
            continue
        verdict = m.group(1).split(":")[0].strip()  # 'bloqueado: <motivo>' é a forma do bloqueio
        if verdict not in VERDICTS:
            rep.err(where, f"{iid} com veredito '{verdict}'; use {', '.join(sorted(VERDICTS))}")
        elif verdict in ("falhou", "bloqueado"):
            d = re.search(r"^- Dono: (.+)$", chunk, re.M)
            if not d:
                rep.err(where, f"{iid} {verdict} sem a linha '- Dono: ...' ({', '.join(sorted(OWNERS))})")
            elif d.group(1).strip() not in OWNERS:
                rep.err(where, f"{iid} com dono '{d.group(1).strip()}'; use {', '.join(sorted(OWNERS))}")


def check_orquestracao(rep, folder, root):
    path = folder / "orquestracao.md"
    where = str(path.relative_to(root))
    text = path.read_text(encoding="utf-8")
    if "—" in text:
        rep.err(where, "travessão '—'; use dois-pontos, vírgula ou ponto")
    if not re.search(r"^# Orquestração: .+$", text, re.M):
        rep.err(where, "falta o título '# Orquestração: <RF-NNN Nome | fundação>'")
    m = re.search(r"^- Status: (.+)$", text, re.M)
    if not m:
        rep.err(where, "falta a linha '- Status: ...'")
    elif not ORQ_STATUS.match(m.group(1).strip()):
        rep.err(where, f"status desconhecido '{m.group(1).strip()}'")
    if "## Ciclos" not in text:
        rep.err(where, "falta a seção '## Ciclos'")


def main(argv):
    args = argv[1:]
    root = Path(".")
    if "--raiz" in args:
        i = args.index("--raiz")
        root = Path(args[i + 1])
        del args[i:i + 2]
    if len(args) != 1:
        print(__doc__)
        return 2
    root = root.resolve()
    target = (root / args[0]).resolve()
    if not target.is_dir():
        print(f"erro: {args[0]} não é uma pasta")
        return 2
    is_feature = any((target / f).is_file() for f in ("contract.md", "avaliacao.md"))
    folders = [target] if is_feature else sorted(p for p in target.iterdir() if p.is_dir())

    rep = Report()
    roadmap = roadmap_status(root)
    avaliadas = 0
    for folder in folders:
        status = None
        if (folder / "avaliacao.md").is_file():
            avaliadas += 1
            status = check_avaliacao(rep, folder, root)
        if (folder / "orquestracao.md").is_file():
            check_orquestracao(rep, folder, root)
        m = re.match(r"(RF-\d{3})-", folder.name)
        if m and roadmap.get(m.group(1)) == "feito":
            if status is None:
                rep.warn(folder.name, f"{m.group(1)} está feito no roadmap sem avaliacao.md; rode /evaluator")
            elif status != "limpo":
                rep.err(folder.name, f"{m.group(1)} está feito no roadmap, mas a avaliação está '{status}'; "
                                     "corrija o RF ou volte o status com roadmap.py")
    print(f"{avaliadas} avaliação(ões) em {len(folders)} pasta(s): {rep.errors} erro(s), {rep.warnings} aviso(s)")
    return 1 if rep.errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
