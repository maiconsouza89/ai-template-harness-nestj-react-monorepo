#!/usr/bin/env python3
"""Valida os diagramas C4 gerados pela skill c4-writer.

Uso: python3 validate.py docs/architecture/diagrams [--adr-dir docs/architecture/adr]

Para cada conjunto <nome>.md + <nome>-c<N>[-<parte>].puml da pasta, checa o que é mecânico e não
depende de renderizar: esqueleto do .puml (@startuml com o nome do arquivo, pragma de charset,
include do nível, título, SHOW_LEGEND, @enduml), parênteses e aspas balanceados, elementos
proibidos no nível, alias usado em relação sem declaração, texto no lugar do $sprite (ordem de
parâmetros trocada), container sem tecnologia, tag 'hipotese' sem declaração, notas longas e
emoji. No .md: cabeçalho, seções, nenhum código PlantUML, todo .puml listado (e só os que
existem), todo nível C1 a C4 gerado ou pulado com motivo, todo elemento com origem e todo
elemento com tag 'hipotese' na seção Hipóteses. Cruza com a fonte: versão do cabeçalho atrás da
atual é aviso; componente do HLD que não aparece em nenhum diagrama nem em Fora do escopo é
aviso. ADR citado que não existe ou não está accepted/proposed é erro. Sai com código 1 quando
há erro; avisos não derrubam. Só biblioteca padrão.
"""
import re
import sys
from pathlib import Path

LEVELS = {
    "c1": ("<C4/C4_Context>", "System Context"),
    "c2": ("<C4/C4_Container>", "Container"),
    "c3": ("<C4/C4_Component>", "Component"),
    "c4": (None, "Code Level"),
}
PUML_RE = re.compile(r"^(?P<nome>[a-z0-9]+(?:-[a-z0-9]+)*?)-(?P<nivel>c[1-4])(?:-(?P<parte>[a-z0-9-]+))?\.puml$")
REQUIRED_SECTIONS = ["Diagramas", "Origem dos elementos", "Hipóteses", "Fora do escopo", "Conflitos e lacunas"]
# Famílias de macro e a posição (0-based) do $sprite em cada uma.
PERSON_SYSTEM = r"(?:Person|System|SystemDb|SystemQueue)(?:_Ext)?"
CONTAINER = r"(?:Container|ContainerDb|ContainerQueue)(?:_Ext)?"
COMPONENT = r"(?:Component|ComponentDb|ComponentQueue)(?:_Ext)?"
BOUNDARY = r"(?:System_Boundary|Container_Boundary|Enterprise_Boundary|Boundary)"
REL = r"(?:Rel|BiRel|Rel_[UDLR]|Rel_(?:Up|Down|Left|Right|Back|Neighbor)|BiRel_[UDLR])"
ELEMENT_RE = re.compile(rf"^\s*(?P<macro>{PERSON_SYSTEM}|{CONTAINER}|{COMPONENT}|{BOUNDARY})\s*\(")
REL_RE = re.compile(rf"^\s*(?P<macro>{REL})\s*\(")
ALIAS_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
ADR_REF = re.compile(r"ADR-(\d{4})")
ADR_FILE_RE = re.compile(r"^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$")
FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF☀-➿\U0001F000-\U0001F2FF]")
# Português sem acento: terminações e palavras que quase nunca estão certas sem o sinal.
NO_ACCENT_RE = re.compile(r"\b[A-Za-z]+(?:cao|coes|soes)\b|\b(?:[Ss]ervico|[Pp]ublic[oa]|[Uu]suario|[Hh]istorico|"
                          r"[Mm]etricas?|[Pp]agina|[Cc]odigo|[Ll]ogica|[Mm]odulos?|[Ee]xibicao|[Nn]ao|[Ss]ao)\b")

errors, warnings = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def norm(s):
    return re.sub(r"\s+", " ", s.replace("`", "").strip().lower())


# ---------- PlantUML ----------

def split_args(line, start):
    """Argumentos de uma macro a partir do '(' em start. Respeita aspas e parênteses aninhados.
    Devolve (lista de args sem espaços nas pontas, fechou?)."""
    args, cur, depth, quoted, i = [], "", 0, False, start + 1
    while i < len(line):
        c = line[i]
        if quoted:
            cur += c
            if c == '"':
                quoted = False
        elif c == '"':
            quoted, cur = True, cur + c
        elif c == "(":
            depth, cur = depth + 1, cur + c
        elif c == ")":
            if depth == 0:
                args.append(cur.strip())
                return args, True
            depth, cur = depth - 1, cur + c
        elif c == "," and depth == 0:
            args.append(cur.strip())
            cur = ""
        else:
            cur += c
        i += 1
    return args, False


def unquote(a):
    return a[1:-1] if len(a) >= 2 and a[0] == '"' and a[-1] == '"' else a


def positional(args):
    """Argumentos posicionais (até o primeiro nomeado, como o PlantUML faz) e os nomeados."""
    pos, named = [], {}
    for a in args:
        m = re.match(r"^\$(\w+)\s*=\s*(.*)$", a)
        if m:
            named[m.group(1)] = unquote(m.group(2).strip())
        else:
            pos.append(unquote(a))
    return pos, named


def balance(line):
    """Parênteses e aspas por linha, fora de strings. Notas e comentários ficam de fora."""
    depth, quoted = 0, False
    for c in line:
        if c == '"':
            quoted = not quoted
        elif not quoted and c == "(":
            depth += 1
        elif not quoted and c == ")":
            depth -= 1
    return depth == 0 and not quoted


def check_puml(path, nivel):
    name = path.name
    text = path.read_text(encoding="utf-8")
    lines = [ln.rstrip("\n") for ln in text.splitlines()]
    content = [ln for ln in lines if ln.strip()]
    info = {"labels": [], "hipoteses": [], "level": nivel}
    if not content:
        err(f"{name}: arquivo vazio")
        return info
    if content[0].strip() != f"@startuml {path.stem}":
        err(f"{name}: a primeira linha deve ser '@startuml {path.stem}'")
    if len(content) < 2 or content[1].strip() != "!pragma charset UTF-8":
        err(f"{name}: a segunda linha deve ser '!pragma charset UTF-8'")
    if content[-1].strip() != "@enduml":
        err(f"{name}: a última linha deve ser '@enduml'")

    include, level_name = LEVELS[nivel]
    includes = [ln.strip() for ln in lines if ln.strip().startswith("!include")]
    if include and f"!include {include}" not in includes:
        err(f"{name}: falta '!include {include}'")
    if not include and any("C4/" in i or "C4_" in i for i in includes):
        err(f"{name}: C4 Code Level é diagrama de classes, sem include da biblioteca C4")
    titles = [ln.strip() for ln in lines if ln.strip().startswith("title ")]
    if not titles or not re.match(rf"^title C{nivel[1]} • {re.escape(level_name)} - \S", titles[0]):
        err(f"{name}: título deve ser 'title C{nivel[1]} • {level_name} - <Nome>'")
    legend = any(ln.strip() == "SHOW_LEGEND()" for ln in lines)
    if include and not legend:
        err(f"{name}: falta SHOW_LEGEND() antes do @enduml")
    if not include and legend:
        err(f"{name}: SHOW_LEGEND() não funciona no diagrama de classes do C4 Code Level")

    aliases, rels, tags_used = set(), [], set()
    in_note = False
    note_bullets = 0
    for n, ln in enumerate(lines, 1):
        s = ln.strip()
        if EMOJI_RE.search(s):
            err(f"{name}:{n}: emoji no diagrama")
        # Só texto visível: strings entre aspas, título e corpo de nota. Alias sem acento é regra.
        visible = " ".join(re.findall(r'"([^"]*)"', s))
        if in_note or s.startswith("title "):
            visible = s
        hit = NO_ACCENT_RE.search(visible)
        if hit:
            warn(f"{name}:{n}: '{hit.group(0)}' parece português sem acento")
        if re.match(r"^note\b", s) and not re.search(r"\bnote\b.*:", s):
            in_note, note_bullets = True, 0
            continue
        if in_note:
            if s == "end note":
                in_note = False
                if note_bullets > 5:
                    warn(f"{name}:{n}: nota com {note_bullets} bullets; o limite é 5, divida ou corte")
            elif s.startswith("•"):
                note_bullets += 1
            continue
        if not s or s.startswith("'"):
            continue
        if not balance(s):
            err(f"{name}:{n}: parênteses ou aspas sem fechar")
            continue
        m = ELEMENT_RE.match(ln)
        if m:
            macro = m.group("macro")
            args, closed = split_args(ln, m.end() - 1)
            pos, named = positional(args)
            if not pos or not ALIAS_RE.match(pos[0]):
                err(f"{name}:{n}: alias inválido em {macro}; use letras sem acento, dígitos e _")
                continue
            if pos[0] in aliases:
                err(f"{name}:{n}: alias '{pos[0]}' declarado duas vezes")
            aliases.add(pos[0])
            label = pos[1] if len(pos) > 1 else ""
            tags = named.get("tags", "")
            if re.fullmatch(PERSON_SYSTEM, macro):
                sprite_idx = 3
                if len(pos) > 4:
                    tags = tags or pos[4]
            elif re.fullmatch(BOUNDARY, macro):
                sprite_idx = None
            else:
                sprite_idx = 4
                if len(pos) > 5:
                    tags = tags or pos[5]
                if nivel == "c2" and macro.startswith("Container") and not macro.endswith("_Ext") \
                        and (len(pos) < 3 or not pos[2].strip()):
                    warn(f"{name}:{n}: container '{label}' sem tecnologia ($techn)")
            if sprite_idx is not None and len(pos) > sprite_idx and pos[sprite_idx].strip():
                sp = pos[sprite_idx]
                if " " in sp or not sp.isascii():
                    err(f"{name}:{n}: '{sp}' está na posição do $sprite em {macro}; confira a ordem "
                        f"(System: alias, label, descr; Container/Component: alias, label, techn, descr)")
            if nivel == "c1" and re.fullmatch(f"{CONTAINER}|{COMPONENT}", macro):
                err(f"{name}:{n}: {macro} não pertence ao C1 System Context")
            if nivel == "c2" and re.fullmatch(COMPONENT, macro):
                err(f"{name}:{n}: {macro} não pertence ao C2 Container")
            if label and not re.fullmatch(BOUNDARY, macro):
                info["labels"].append(label)
            elif label and re.fullmatch(BOUNDARY, macro):
                info.setdefault("boundaries", []).append(label)
            if "hipotese" in tags.split("+"):
                tags_used.add("element")
                info["hipoteses"].append(label)
            continue
        m = REL_RE.match(ln)
        if m:
            args, _ = split_args(ln, m.end() - 1)
            pos, named = positional(args)
            if len(pos) < 3:
                err(f"{name}:{n}: {m.group('macro')} precisa de origem, destino e rótulo")
                continue
            rels.append((n, pos[0], pos[1]))
            if len(pos) > 5 and pos[5].strip() and (" " in pos[5] or not pos[5].isascii()):
                err(f"{name}:{n}: '{pos[5]}' está na posição do $sprite em {m.group('macro')}; "
                    f"a ordem é from, to, label, techn, descr")
            if nivel == "c1" and len(pos) > 3 and pos[3].strip():
                warn(f"{name}:{n}: relação com tecnologia no C1; protocolo fica do C2 em diante")
            tags = named.get("tags", pos[6] if len(pos) > 6 else "")
            if "hipotese" in tags.split("+"):
                tags_used.add("rel")
                info["hipoteses"].append(pos[2])

    for n, a, b in rels:
        for alias in (a, b):
            if alias not in aliases:
                err(f"{name}:{n}: relação usa '{alias}', que não foi declarado neste diagrama")
    if "element" in tags_used and not re.search(r'AddElementTag\(\s*"hipotese"', text):
        err(f"{name}: elemento com tag 'hipotese' sem AddElementTag(\"hipotese\", ...)")
    if "rel" in tags_used and not re.search(r'AddRelTag\(\s*"hipotese"', text):
        err(f"{name}: relação com tag 'hipotese' sem AddRelTag(\"hipotese\", ...)")

    if nivel == "c3" and not any(ELEMENT_RE.match(ln) and re.match(rf"\s*{COMPONENT}\s*\(", ln) for ln in lines):
        err(f"{name}: C3 sem nenhum Component")
    if nivel == "c4":
        if not re.search(r"^\s*(?:abstract\s+class|class|interface|enum)\s+\w", text, re.MULTILINE):
            err(f"{name}: C4 Code Level sem class, interface ou enum")
        if "skinparam packageStyle rectangle" not in text:
            warn(f"{name}: falta 'skinparam packageStyle rectangle' no C4 Code Level")
        for m in re.finditer(r"^\s*(?:abstract\s+class|class|interface|enum)\s+(\w+)(.*)$", text, re.MULTILINE):
            info["labels"].append(m.group(1))
            if "<<hipótese>>" in m.group(2):
                info["hipoteses"].append(m.group(1))
    return info


# ---------- Markdown ----------

def split_sections(text):
    parts = re.split(r"^## (.+)$", text, flags=re.MULTILINE)
    return {parts[i].strip(): parts[i + 1] for i in range(1, len(parts), 2)}


def table_rows(body):
    rows = []
    for line in body.splitlines():
        s = line.strip()
        if not s.startswith("|"):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", c) for c in cells if c):
            continue
        rows.append(cells)
    return rows[1:]  # sem o cabeçalho


def source_version(path):
    """Versão declarada num documento do repositório ('Versão: X.Y.Z' ou front-matter 'version')."""
    if not path.is_file():
        return None
    m = re.search(r"^(?:Versão|version):\s*\"?([0-9][\w.-]*)", path.read_text(encoding="utf-8"), re.MULTILINE)
    return m.group(1) if m else None


def hld_components(path):
    """Nomes da tabela de 'Componentes e responsabilidades' de um HLD da skill hld-writer."""
    if not path.is_file():
        return []
    secs = split_sections(path.read_text(encoding="utf-8"))
    body = secs.get("Componentes e responsabilidades", "")
    return [r[0] for r in table_rows(body) if r and r[0]]


def load_adrs(adr_dir):
    out = {}
    if not adr_dir.is_dir():
        return out
    for p in sorted(adr_dir.glob("*.md")):
        m = ADR_FILE_RE.match(p.name)
        if not m:
            continue
        fm = FM_RE.match(p.read_text(encoding="utf-8"))
        status = ""
        if fm:
            sm = re.search(r"^status:\s*(\S+)", fm.group(1), re.MULTILINE)
            status = sm.group(1).strip("\"'") if sm else ""
        out[m.group(1)] = status
    return out


def check_md(md, pumls, infos, root, adrs):
    name = md.name
    text = md.read_text(encoding="utf-8")
    if re.search(r"@startuml|```\s*(?:plantuml|puml)", text):
        err(f"{name}: o .md não leva código PlantUML; ele fica só nos .puml")
    if not re.search(r"^# C4: \S", text, re.MULTILINE):
        err(f"{name}: falta o título '# C4: <Nome>'")
    fonte = re.search(r"^Fonte:\s*(\S+)\s+versão\s+(.+)$", text, re.MULTILINE)
    if not fonte:
        err(f"{name}: falta a linha 'Fonte: <caminho> versão <X.Y.Z ou não informada>'")
    if not re.search(r"^ADRs:\s*\S", text, re.MULTILINE):
        err(f"{name}: falta a linha 'ADRs: <números> ou nenhum'")
    if not re.search(r"^Data:\s*\d{4}-\d{2}-\d{2}\s*$", text, re.MULTILINE):
        err(f"{name}: falta 'Data: AAAA-MM-DD'")
    if re.search(r"\[[A-Z][^\]]*\]", re.sub(r"\[[^\]]*\]\([^)]*\)", "", text)):
        err(f"{name}: placeholder do template esquecido (texto entre colchetes)")
    secs = split_sections(text)
    order = [s for s in secs if s in REQUIRED_SECTIONS]
    for s in REQUIRED_SECTIONS:
        if s not in secs:
            err(f"{name}: falta a seção '## {s}'")
        elif not secs[s].strip().strip("-").strip():
            err(f"{name}: seção '## {s}' vazia; sem conteúdo, diga que não se aplica")
    if order != [s for s in REQUIRED_SECTIONS if s in secs]:
        err(f"{name}: seções fora da ordem do template")

    # Diagramas: cada .puml listado, cada nível C1..C4 gerado ou pulado com motivo.
    listed, levels_seen = set(), set()
    for row in table_rows(secs.get("Diagramas", "")):
        if len(row) < 4:
            continue
        lv = re.match(r"C([1-4])", row[0])
        if not lv:
            err(f"{name}: linha de Diagramas com nível inválido: '{row[0]}'")
            continue
        levels_seen.add(f"c{lv.group(1)}")
        files = re.findall(r"`([^`]+\.puml)`", row[1])
        if files:
            for f in files:
                listed.add(f)
                if f not in pumls:
                    err(f"{name}: Diagramas cita '{f}', que não existe na pasta")
                elif PUML_RE.match(f).group("nivel") != f"c{lv.group(1)}":
                    err(f"{name}: '{f}' está na linha do nível C{lv.group(1)}")
        elif norm(row[1]) == "pulado":
            if not row[3].strip():
                err(f"{name}: nível C{lv.group(1)} pulado sem motivo na coluna 'O que mostra'")
        else:
            err(f"{name}: coluna Arquivo do C{lv.group(1)} deve ter o .puml entre crases ou 'pulado'")
    for f in pumls:
        if f not in listed:
            err(f"{name}: '{f}' existe na pasta e não está na tabela Diagramas")
    for lv in LEVELS:
        if lv not in levels_seen:
            err(f"{name}: nível {lv.upper()} não aparece em Diagramas; gere ou marque 'pulado' com motivo")

    # Origem: todo elemento rastreável até a fonte.
    origem = {}
    for row in table_rows(secs.get("Origem dos elementos", "")):
        if row and row[0]:
            origem[norm(row[0])] = row[-1] if len(row) >= 3 else ""
    for f, info in infos.items():
        for label in info["labels"]:
            key = norm(label)
            if key not in origem:
                err(f"{name}: elemento '{label}' de {f} não está em Origem dos elementos")
            elif not origem[key].strip():
                err(f"{name}: elemento '{label}' sem origem preenchida")

    # Hipóteses: todo elemento tracejado explicado.
    hip_text = norm(secs.get("Hipóteses", ""))
    for f, info in infos.items():
        for h in info["hipoteses"]:
            if norm(h) not in hip_text:
                err(f"{name}: '{h}' tem tag hipotese em {f} e não está na seção Hipóteses")

    # ADRs citados.
    adr_line = re.search(r"^ADRs:(.*)$", text, re.MULTILINE)
    cited = set(ADR_REF.findall(text)) | set(re.findall(r"\b(\d{4})\b", adr_line.group(1) if adr_line else ""))
    for num in sorted(cited) if adrs is not None else []:
        if num not in adrs:
            err(f"{name}: ADR-{num} citado e não existe em docs/architecture/adr/")
        elif adrs[num] not in ("accepted", "proposed"):
            err(f"{name}: ADR-{num} está '{adrs[num]}'; cite o sucessor ou retire")

    # Fonte: versão e cobertura dos componentes do HLD.
    if fonte:
        src = root / fonte.group(1).strip("`")
        if not src.is_file():
            warn(f"{name}: fonte '{fonte.group(1)}' não existe mais; diagramas podem estar órfãos")
        else:
            atual, declarada = source_version(src), fonte.group(2).strip()
            if atual and declarada != atual:
                warn(f"{name}: fonte está na versão {atual} e os diagramas foram gerados da {declarada}; "
                     f"rode /c4-writer para atualizar")
            all_labels = {norm(lb) for info in infos.values() for lb in info["labels"] + info.get("boundaries", [])}
            fora = norm(secs.get("Fora do escopo", ""))
            for comp in hld_components(src):
                if norm(comp) not in all_labels and norm(comp) not in fora:
                    warn(f"{name}: componente '{comp}' do HLD não aparece em nenhum diagrama nem em Fora do escopo")


def main(argv):
    args = argv[1:]
    adr_dir = None
    if "--adr-dir" in args:
        i = args.index("--adr-dir")
        adr_dir = Path(args[i + 1])
        del args[i:i + 2]
    if len(args) != 1:
        print(__doc__.split("\n\n")[1], file=sys.stderr)
        return 2
    folder = Path(args[0])
    if not folder.is_dir():
        print(f"pasta não encontrada: {folder}", file=sys.stderr)
        return 2
    root = Path.cwd()
    adrs = load_adrs(adr_dir or root / "docs/architecture/adr")
    adrs = adrs if adrs or (adr_dir and adr_dir.is_dir()) or (root / "docs/architecture/adr").is_dir() else None

    groups = {}
    for p in sorted(folder.glob("*.puml")):
        m = PUML_RE.match(p.name)
        if not m:
            err(f"{p.name}: nome fora do padrão <nome>-c<N>[-<parte>].puml (minúsculas, dígitos e hífen)")
            continue
        groups.setdefault(m.group("nome"), {})[p.name] = (p, m.group("nivel"))
    mds = {p.stem: p for p in folder.glob("*.md") if p.name.lower() != "readme.md"}
    for nome in sorted(set(groups) | set(mds)):
        pumls = groups.get(nome, {})
        infos = {f: check_puml(p, nv) for f, (p, nv) in pumls.items()}
        if nome not in mds:
            err(f"{nome}: há .puml sem o {nome}.md que lista a origem dos elementos")
            continue
        check_md(mds[nome], pumls, infos, root, adrs)

    for w in warnings:
        print(f"aviso: {w}")
    for e in errors:
        print(f"erro: {e}")
    total = sum(len(g) for g in groups.values())
    print(f"{total} diagramas em {len(mds)} conjuntos: {len(errors)} erros, {len(warnings)} avisos")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
