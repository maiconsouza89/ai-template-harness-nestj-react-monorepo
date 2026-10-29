#!/usr/bin/env python3
"""Prepara a implementação de um RF ou da fundação: diz se pode começar e o que há para fazer.

Uso:
  python3 preparar.py RF-002            (ou 2, ou o caminho da pasta ou de um arquivo dela)
  python3 preparar.py fundacao
Opções: --raiz <dir> (padrão: diretório atual, a raiz do repositório).

Lê a pasta da feature (spec.md, plan.md, contract.md) e imprime a ficha da execução:
bloqueios, avisos, branch e working tree, fases do plano com as já commitadas neste
branch, pré-requisitos do plano e do contrato, gates de qualidade, superfícies, pendentes
de ADR da spec e ADRs aceitos. A forma dos três arquivos e o cruzamento com PRD, HLD e
roadmap são do validate.py da spec-writer, chamado aqui pela linha de comando, assim como
o contexto.py dela para dependências e status (mesma conta que a spec usou).

Sai com código 1 quando há bloqueio; avisos não derrubam. Só biblioteca padrão.
"""
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.dont_write_bytecode = True

FEATURES_DIR = Path("docs/features")
ADR_DIR = Path("docs/architecture/adr")
SPEC_SCRIPTS = Path(".claude/skills/spec-writer/scripts")
FUNDACAO = "fundacao"
STACK_SCRIPTS = ("lint", "format", "test", "build")
TRIPLE = ("spec.md", "plan.md", "contract.md")
# Pré-requisitos que a implementação produz como artefato; os outros dois são de quem exercita.
PRODUZIDOS = ("Estado persistido", "Entradas estáticas", "Configuração")


def run(cmd, root):
    r = subprocess.run(cmd, cwd=root, capture_output=True, text=True)
    return r.returncode, r.stdout.strip(), r.stderr.strip()


def sections(text, level):
    """Divide o markdown pelos títulos do nível dado: {título: corpo}."""
    mark = "#" * level + " "
    out, cur = {}, None
    for line in text.splitlines():
        if line.startswith(mark):
            cur = line[len(mark):].strip()
            out[cur] = []
        elif cur is not None:
            out[cur].append(line)
    return {k: "\n".join(v) for k, v in out.items()}


def bullets(block):
    return [ln[2:].strip() for ln in block.splitlines() if ln.startswith("- ")]


def labeled(block, label):
    """Bullets logo abaixo de uma linha-rótulo solta ('Pendentes de ADR'), até a próxima linha vazia."""
    lines = block.splitlines()
    for i, ln in enumerate(lines):
        if ln.strip() == label:
            got = []
            for nxt in lines[i + 1:]:
                if not nxt.startswith("- "):
                    break
                got.append(nxt[2:].strip())
            return got
    return []


def resolve(root, alvo):
    """Pasta da feature e o id ('RF-002' ou 'fundacao')."""
    p = Path(alvo)
    if (root / p).exists():
        folder = root / p if (root / p).is_dir() else (root / p).parent
        name = folder.name
        return folder, (FUNDACAO if name == FUNDACAO else name[:6])
    if alvo.lower() in (FUNDACAO, "fundação"):
        return root / FEATURES_DIR / FUNDACAO, FUNDACAO
    m = re.fullmatch(r"(?i)(?:rf-?)?0*(\d{1,3})", alvo.strip())
    if not m:
        return None, None
    rid = f"RF-{int(m.group(1)):03d}"
    base = root / FEATURES_DIR
    found = sorted(d for d in base.iterdir() if d.is_dir() and d.name.startswith(rid + "-")) if base.is_dir() else []
    return (found[0] if found else None), rid


def contexto_rf(root, rid):
    """Status no roadmap e dependências não feitas, pelo contexto.py da spec-writer."""
    code, out, err = run([sys.executable, str(SPEC_SCRIPTS / "contexto.py"), "rf", rid], root)
    if code != 0:
        return None, None, None, err or out
    status = re.search(r"^- Status no roadmap: (.+)$", out, re.M)
    nome = re.search(r"^# Contexto: RF-\d{3} (.+)$", out, re.M)
    nao_feitos = re.search(r"^- Não feitos no roadmap: (.+)$", out, re.M)
    pend = [x.strip() for x in nao_feitos.group(1).split(",")] if nao_feitos else []
    return (status.group(1) if status else "sem roadmap"), (nome.group(1) if nome else ""), pend, None


def passos_do_rodape(valor):
    """'19-20' ou '3,5-6' -> {19, 20} ou {3, 5, 6}."""
    out = set()
    for parte in valor.split(","):
        a, _, b = parte.strip().partition("-")
        out.update(range(int(a), int(b or a) + 1))
    return out


def commits_por_fase(root, alvo_id):
    """Fases já commitadas neste branch, pelos rodapés 'Refs: <alvo>' e 'Plan-Phase: N', e os
    passos de fases commitadas em partes, pelo rodapé 'Plan-Step: a-b'."""
    code, base, _ = run(["git", "merge-base", "HEAD", "main"], root)
    rng = f"{base}..HEAD" if code == 0 and base else "HEAD"
    code, out, _ = run(["git", "log", rng, "--format=%h%x00%B%x01"], root)
    feitas, partes = {}, []
    if code != 0:
        return feitas, partes
    for entry in out.split("\x01"):
        if "\x00" not in entry:
            continue
        sha, body = entry.strip().split("\x00", 1)
        if re.search(rf"^Refs: .*\b{re.escape(alvo_id)}\b", body, re.M):
            for n in re.findall(r"^Plan-Phase: (\d+)$", body, re.M):
                feitas.setdefault(int(n), sha)
            for v in re.findall(r"^Plan-Step: (\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)$", body, re.M):
                partes.append((passos_do_rodape(v), sha))
    return feitas, partes


def adrs_aceitos(root):
    out = []
    d = root / ADR_DIR
    for f in sorted(d.glob("[0-9][0-9][0-9][0-9]-*.md")) if d.is_dir() else []:
        head = f.read_text(encoding="utf-8").split("---", 2)
        meta = head[1] if len(head) > 2 else ""
        st = re.search(r"^status:\s*(\S+)", meta, re.M)
        ti = re.search(r'^title:\s*"?(.*?)"?\s*$', meta, re.M)
        if st and st.group(1) == "accepted":
            out.append(f"{f.name[:4]} {ti.group(1) if ti else f.stem}")
    return out


def slug_branch(alvo_id, nome):
    base = re.sub(r"[^a-z0-9]+", "-", nome.lower()).strip("-") if nome else ""
    if alvo_id == FUNDACAO:
        return "feat/fundacao"
    return f"feat/{alvo_id.lower()}-{base}".rstrip("-")


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
    bloqueios, avisos = [], []

    folder, alvo_id = resolve(root, args[0])
    if alvo_id is None:
        print(f"erro: alvo '{args[0]}' não é RF-NNN, número, 'fundacao' nem caminho existente")
        return 2
    if folder is None or not folder.is_dir():
        print(f"# Preparação: {alvo_id}\n\n## Bloqueios\n- sem pasta em {FEATURES_DIR}/; gere spec, plano e contrato com /spec-writer")
        return 1
    faltam = [f for f in TRIPLE if not (folder / f).is_file()]
    if faltam:
        print(f"# Preparação: {alvo_id}\n\n## Bloqueios\n- {', '.join(faltam)} faltando em {folder.relative_to(root)}; "
              "os três nascem juntos, regenere com /spec-writer")
        return 1

    spec = (folder / "spec.md").read_text(encoding="utf-8")
    plan = (folder / "plan.md").read_text(encoding="utf-8")
    contract = (folder / "contract.md").read_text(encoding="utf-8")
    rel = folder.relative_to(root)

    # forma e cruzamento: validate.py da spec-writer
    code, out, err = run([sys.executable, str(SPEC_SCRIPTS / "validate.py"), str(rel)], root)
    resumo_validacao = (out.splitlines() or [err])[-1]
    if code != 0:
        erros = [ln.strip() for ln in (out + "\n" + err).splitlines() if "erro" in ln.lower()]
        bloqueios.append("validate.py da spec-writer acusa erro; corrija com /spec-writer (Revisão): "
                         + "; ".join(erros[:5]))
    for ln in out.splitlines():
        if ln.strip().startswith("aviso"):
            avisos.append(ln.strip())

    # dependências, roadmap e fundação
    nome = ""
    stack = [s for s in STACK_SCRIPTS if (root / "scripts" / f"{s}.sh").is_file()]
    if alvo_id != FUNDACAO:
        status, nome, pend, erro = contexto_rf(root, alvo_id)
        if erro:
            bloqueios.append(f"contexto.py não leu o {alvo_id}: {erro}")
        else:
            if status == "bloqueado":
                bloqueios.append(f"{alvo_id} está bloqueado no roadmap; veja a Observação em docs/product/roadmap.md")
            elif status == "feito":
                avisos.append(f"{alvo_id} já está feito no roadmap; executar de novo é retrabalho")
            elif status == "pendente":
                avisos.append(f"{alvo_id} está pendente no roadmap; passa a em andamento ao começar")
            if pend:
                bloqueios.append(f"dependências não feitas no roadmap: {', '.join(pend)}. O código que este RF "
                                 "consome ainda não existe; implemente-as antes, ou corrija o roadmap se já estão prontas")
        if not stack:
            bloqueios.append("fundação não implementada (nenhum scripts/<alvo>.sh da stack); implemente a fundação antes")
        roadmap = status
    else:
        roadmap = "não entra no roadmap"
        if stack:
            avisos.append(f"scripts da stack já existem ({', '.join(stack)}); a fundação pode estar implementada em parte")

    # git
    _, branch, _ = run(["git", "branch", "--show-current"], root)
    _, sujos, _ = run(["git", "status", "--porcelain"], root)
    sujos = [ln for ln in sujos.splitlines() if ln.strip()]
    feitas, partes = commits_por_fase(root, alvo_id)

    # plano
    plan_sec = sections(plan, 2)
    fases = []
    for titulo, corpo in plan_sec.items():
        m = re.match(r"Fase (\d+): (.+)", titulo)
        if m:
            passos = [int(n) for n in re.findall(r"^(\d+)\. \*\*", corpo, re.M)]
            fases.append((int(m.group(1)), m.group(2), passos))
    if not fases:
        bloqueios.append("plan.md sem '## Fase N: ...'; regenere com /spec-writer")

    # contrato
    c_sec = sections(contract, 2)
    prereq = sections(c_sec.get("Pré-requisitos", ""), 3)
    gates = re.findall(r"^- \*\*(.+?)\*\*: `(.+?)`", c_sec.get("Gates de qualidade", ""), re.M)
    manifesto = [ln for ln in c_sec.get("Manifesto de cobertura", "").splitlines()
                 if ln.startswith("| ") and not ln.startswith("| ---") and "Coberto por" not in ln]
    superficies = {}
    passou_manifesto = False
    for titulo, corpo in c_sec.items():
        if titulo == "Manifesto de cobertura":
            passou_manifesto = True
            continue
        if passou_manifesto:
            superficies[titulo] = re.findall(r"^#### (\S+)", corpo, re.M)

    # spec
    pendentes_adr = [p for p in labeled(sections(spec, 2).get("Decisões e hipóteses", ""), "Pendentes de ADR")
                     if p.strip(". ").lower() != "nenhuma"]

    # saída
    titulo = f"{alvo_id} {nome}".strip() if alvo_id != FUNDACAO else "fundação"
    print(f"# Preparação: {titulo}\n")
    print(f"- Pasta: {rel}/")
    print(f"- Validação da spec: {resumo_validacao}")
    print(f"- Roadmap: {roadmap}")
    print(f"- Scripts da stack: {', '.join(stack) or 'nenhum'}")
    if branch == "main" or not branch:
        print(f"- Branch: {branch or '(HEAD solta)'}; criar `{slug_branch(alvo_id, slug_nome(nome))}` antes de começar")
    else:
        print(f"- Branch: {branch}")
    if sujos:
        print(f"- Working tree: {len(sujos)} alteração(ões) fora de commit: "
              + ", ".join(ln[3:] for ln in sujos[:8]) + (" ..." if len(sujos) > 8 else ""))
    else:
        print("- Working tree: limpa")

    print("\n## Bloqueios")
    print("\n".join(f"- {b}" for b in bloqueios) or "- nenhum")
    print("\n## Avisos")
    print("\n".join(f"- {a}" for a in avisos) or "- nenhum")

    print("\n## Fases do plano")
    for n, nome_fase, passos in sorted(fases):
        faixa = f"passos {passos[0]} a {passos[-1]}" if len(passos) > 1 else f"passo {passos[0]}" if passos else "sem passos"
        estado = f"commitada em {feitas[n]}" if n in feitas else "por fazer"
        if n not in feitas:
            feitos = [(sorted(ps & set(passos)), sha) for ps, sha in partes if ps & set(passos)]
            if feitos:
                ja = sorted({x for ps, _ in feitos for x in ps})
                falta = [x for x in passos if x not in ja]
                estado = ("parcial: " + "; ".join(f"passos {','.join(map(str, ps))} em {sha}" for ps, sha in feitos)
                          + f"; faltam {','.join(map(str, falta)) or 'nenhum'}")
        print(f"- Fase {n}: {nome_fase} ({faixa}) [{estado}]")
    pre_plano = bullets(plan_sec.get("Pré-requisitos", ""))
    if pre_plano:
        print("\n## Pré-requisitos do plano (conferir antes da fase 1)")
        print("\n".join(f"- {p}" for p in pre_plano))

    print("\n## Pré-requisitos do contrato que a implementação produz")
    for sub in PRODUZIDOS:
        itens = bullets(prereq.get(sub, ""))
        if not itens:
            continue
        print(f"{sub}:")
        for it in itens:
            marca = ""
            if sub == "Entradas estáticas":
                m = re.match(r"`([^`]+)`", it)
                if m:
                    marca = " [existe]" if (root / m.group(1)).exists() else " [não existe]"
            print(f"- {it.split('. Usado por:')[0]}{marca}")
    ref = [s for s in prereq if s not in PRODUZIDOS]
    if ref:
        print(f"Só referência (de quem exercita o contrato): {', '.join(ref)}")

    print("\n## Gates de qualidade")
    print("\n".join(f"- {n}: `{c}`" for n, c in gates) or "- nenhum declarado")
    total = sum(len(v) for v in superficies.values())
    print(f"\n## Contrato: {len(manifesto)} critério(s) no manifesto, {total} item(ns)")
    for s, ids in superficies.items():
        print(f"- {s}: {len(ids)}")

    if pendentes_adr:
        print("\n## Pendentes de ADR na spec (conferir contra os aceitos abaixo)")
        print("\n".join(f"- {p.split(':')[0]}" for p in pendentes_adr))
        print("\n## ADRs aceitos")
        print("\n".join(f"- {a}" for a in adrs_aceitos(root)) or "- nenhum")
    return 1 if bloqueios else 0


def slug_nome(nome):
    nome = re.sub(r"\([^)]*\)", "", nome)
    return unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()


if __name__ == "__main__":
    sys.exit(main(sys.argv))
