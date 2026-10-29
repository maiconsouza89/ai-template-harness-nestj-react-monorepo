#!/usr/bin/env python3
"""Audita um diretório de ADRs (formato MADR minimal).

Uso:
    python3 audit.py <caminho/para/docs/architecture/adr>            # audita
    python3 audit.py <caminho/para/docs/architecture/adr> --index    # audita e regenera index.md

Verifica só o que é mecânico e determinístico: nome de arquivo, front-matter,
ciclo de status, numeração e integridade das cadeias de supersede.

Seções e chaves obrigatórias vêm do `assets/template.md` da skill (menos as
listadas em OPTIONAL_SECTIONS, checadas só quando presentes). O template fica
só na skill, e não no acervo, para não haver duas cópias que divergem. Sem ele,
cai no conjunto padrão.

Sai com código 1 se houver erro, 0 se só houver aviso (ou nada).
"""

import re
import sys
from pathlib import Path

STATUSES = {"proposed", "accepted", "rejected", "superseded", "deprecated"}
TERMINAL = {"rejected", "superseded", "deprecated"}
FILENAME_RE = re.compile(r"^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$")
H1_RE = re.compile(r"^#\s+(\d{4})\.\s+(\S.*)$", re.MULTILINE)
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
SKIP = {"readme.md", "index.md"}
TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "template.md"

CONTEXT = "## Contexto e problema"
OPTIONS = "## Opções consideradas"
CONSEQUENCES = "## Consequências"
REFERENCES = "## Referências"

DEFAULT_SECTIONS = [CONTEXT, OPTIONS, "## Decisão", CONSEQUENCES]
DEFAULT_FM_KEYS = ["status", "date", "title", "description", "supersedes", "superseded-by"]

# Seções que o template traz mas que nem todo ADR precisa ter.
OPTIONAL_SECTIONS = {REFERENCES}

URL_RE = re.compile(r"https?://\S+")
CONSULTED_RE = re.compile(r"[Cc]onsultado em (\d{4}-\d{2}-\d{2})")

INDEX_NAME = "index.md"
INDEX_MARKER = "<!-- Gerado por scripts/audit.py --index. Não edite à mão. -->"

errors, warnings = [], []


def err(f, msg):
    errors.append((f, msg))


def warn(f, msg):
    warnings.append((f, msg))


def parse_front_matter(text):
    """Front-matter chave: valor raso. Retorna None se ausente/malformado."""
    m = FM_RE.match(text)
    if not m:
        return None
    data = {}
    for line in m.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            return None
        k, v = line.split(":", 1)
        data[k.strip()] = v.strip().strip("\"'")
    return data


def required_sections_and_fm_keys():
    if not TEMPLATE.is_file():
        return DEFAULT_SECTIONS, DEFAULT_FM_KEYS
    tpl_text = TEMPLATE.read_text(encoding="utf-8")
    found = [s.strip() for s in re.findall(r"^##\s+.+$", tpl_text, re.MULTILINE)]
    fm = parse_front_matter(tpl_text)
    return (found or DEFAULT_SECTIONS), (list(fm.keys()) if fm else DEFAULT_FM_KEYS)


def section_body(text, heading, all_headings):
    start = text.find(heading)
    if start < 0:
        return ""
    start += len(heading)
    ends = [text.find(h, start) for h in all_headings if text.find(h, start) > -1]
    return text[start : min(ends)] if ends else text[start:]


def render_index(adrs):
    """Índice em ordem numérica, derivado só do front-matter.

    Gerado em vez de mantido à mão porque um índice manual descola do acervo no
    primeiro ADR que alguém esquece de listar, e um índice que mente é pior que
    índice nenhum, já que ninguém confere.
    """
    lines = ["# ADRs", "", INDEX_MARKER, "", "| # | decisão | status | data |", "|---|---|---|---|"]
    for number, adr in sorted(adrs.items()):
        fm = adr["fm"]
        title = fm.get("title") or adr["h1_title"] or "(sem título)"
        lines.append(
            f"| [{number}]({adr['name']}) | {title} | {fm.get('status', '')} | {fm.get('date', '')} |"
        )
    return "\n".join(lines) + "\n"


def main():
    args = [a for a in sys.argv[1:]]
    write_index = "--index" in args
    args = [a for a in args if a != "--index"]
    if len(args) != 1:
        print(__doc__.strip())
        return 2
    adr_dir = Path(args[0])
    if not adr_dir.is_dir():
        print(f"erro: {adr_dir} não é um diretório")
        return 2

    sections, fm_keys = required_sections_and_fm_keys()

    files = sorted(p for p in adr_dir.glob("*.md") if p.name.lower() not in SKIP)
    if not files:
        print(f"Nenhum ADR em {adr_dir}.")
        return 0

    adrs, by_number = {}, {}

    for path in files:
        name = path.name
        text = path.read_text(encoding="utf-8")
        m = FILENAME_RE.match(name)
        if not m:
            err(name, "nome fora do padrão NNNN-titulo-com-hifens.md")
            continue
        number = m.group(1)

        fm = parse_front_matter(text)
        if fm is None:
            err(name, "front-matter ausente ou malformado (bloco --- ... --- no topo)")
            continue

        for key in fm_keys:
            if key not in fm:
                err(name, f"front-matter sem a chave `{key}` (mantenha-a mesmo vazia)")

        status = fm.get("status", "")
        if status not in STATUSES:
            err(name, f"status `{status}` inválido; use um de: {', '.join(sorted(STATUSES))}")

        date = fm.get("date", "")
        if date and not DATE_RE.match(date):
            err(name, f"date `{date}` fora do formato ISO AAAA-MM-DD")

        h1 = H1_RE.search(text)
        h1_title = ""
        if not h1:
            err(name, "sem título `# NNNN. Decisão em voz ativa` no corpo")
        else:
            h1_title = h1.group(2).strip()
            if h1.group(1) != number:
                err(name, f"número do título (`{h1.group(1)}`) diverge do nome do arquivo (`{number}`)")

        for section in sections:
            if section not in text and section not in OPTIONAL_SECTIONS:
                err(name, f"seção obrigatória ausente: `{section}`")

        by_number.setdefault(number, []).append(name)
        adrs[number] = {"name": name, "fm": fm, "status": status, "text": text, "h1_title": h1_title}

        # Orçamento de tamanho: aviso, não erro: o limite é de leitura, não de sintaxe.
        # As seções são localizadas por nome, nunca por posição: o template pode
        # ganhar seções novas (Referências) sem que o orçamento passe a medir a errada.
        ctx_h = CONTEXT if CONTEXT in sections else sections[0]
        opt_h = OPTIONS if OPTIONS in sections else sections[1]
        con_h = CONSEQUENCES if CONSEQUENCES in sections else sections[-1]

        ctx = section_body(text, ctx_h, sections)
        n_sentences = len([s for s in re.split(r"[.!?]\s", ctx.strip()) if s.strip()])
        if n_sentences > 5:
            warn(name, f"Contexto com ~{n_sentences} frases (orçamento: 5); decisões embaralhadas?")
        for heading, limit, label in ((opt_h, 4, "opções"), (con_h, 5, "consequências")):
            bullets = len(re.findall(r"^\s*[-*]\s+\S", section_body(text, heading, sections), re.MULTILINE))
            if bullets > limit:
                warn(name, f"{bullets} {label} (orçamento: {limit})")

        # Referências: opcional, mas se existir tem que ser utilizável.
        if REFERENCES in text:
            refs = section_body(text, REFERENCES, sections)
            bullets = re.findall(r"^\s*[-*]\s+\S.*$", refs, re.MULTILINE)
            if not bullets:
                err(name, "seção `## Referências` sem nenhuma fonte; cite as fontes ou apague a seção")
            for b in bullets:
                if not URL_RE.search(b):
                    err(name, f"referência sem URL: {b.strip()[:60]}")
            if not CONSULTED_RE.search(refs):
                warn(name, "`## Referências` sem `Consultado em AAAA-MM-DD`: fato externo envelhece")

        # Travessão: a regra das três skills de documentação (PRD, HLD, ADR) é não usar.
        # Aviso, não erro: registros antigos não quebram por estilo.
        n_dash = text.count("—")
        if n_dash:
            warn(name, f"{n_dash} travessão(ões) '—' no texto; use dois-pontos, vírgula ou ponto")

    for number, names in sorted(by_number.items()):
        if len(names) > 1:
            err(", ".join(names), f"número {number} duplicado; números nunca se repetem")

    # Cadeias de supersede: os dois lados ou nenhum.
    for number, adr in sorted(adrs.items()):
        name, fm, status = adr["name"], adr["fm"], adr["status"]
        sup_by = fm.get("superseded-by", "")
        sups = fm.get("supersedes", "")

        if status == "superseded" and not sup_by:
            err(name, "status `superseded` sem `superseded-by`; a cadeia fica sem saída")
        if sup_by and status != "superseded":
            err(name, f"tem `superseded-by: {sup_by}` mas status é `{status}`, deveria ser `superseded`")
        if sup_by:
            target = adrs.get(sup_by)
            if not target:
                err(name, f"`superseded-by: {sup_by}` aponta para um ADR que não existe")
            elif target["fm"].get("supersedes", "") != number:
                err(name, f"cadeia de um lado só: {sup_by} não declara `supersedes: \"{number}\"`")
        if sups:
            target = adrs.get(sups)
            if not target:
                err(name, f"`supersedes: {sups}` aponta para um ADR que não existe")
            else:
                if target["fm"].get("superseded-by", "") != number:
                    err(name, f"cadeia de um lado só: {sups} não declara `superseded-by: \"{number}\"`")
                if target["status"] != "superseded":
                    err(name, f"supersede o {sups}, mas o {sups} está como `{target['status']}`")
        if status in TERMINAL and status != "superseded" and sup_by:
            err(name, f"status terminal `{status}` não combina com `superseded-by`")

    numbers = sorted(int(n) for n in adrs)
    if numbers:
        missing = sorted(set(range(1, numbers[-1] + 1)) - set(numbers))
        if missing:
            warn("-", "buracos na numeração: " + ", ".join(f"{n:04d}" for n in missing) + " (ok se foram apagados)")

    # Índice: sempre comparado, escrito só com --index. Assim a auditoria acusa
    # o índice velho sem alterar o repo de quem só quis auditar.
    index_path = adr_dir / INDEX_NAME
    expected = render_index(adrs)
    current = index_path.read_text(encoding="utf-8") if index_path.is_file() else None
    if write_index:
        if current != expected:
            index_path.write_text(expected, encoding="utf-8")
            print(f"index.md regenerado ({index_path})\n")
        else:
            print("index.md já estava atualizado\n")
    elif current is None:
        warn(INDEX_NAME, "não existe; rode `audit.py <dir> --index`")
    elif current != expected:
        warn(INDEX_NAME, "desatualizado em relação ao front-matter; rode `audit.py <dir> --index`")

    print(f"{len(files)} ADR(s) em {adr_dir}\n")
    for label, items in (("ERROS", errors), ("AVISOS", warnings)):
        if items:
            print(f"{label} ({len(items)}):")
            for f, msg in items:
                print(f"  {f}: {msg}")
            print()
    if not errors and not warnings:
        print("Tudo consistente.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
