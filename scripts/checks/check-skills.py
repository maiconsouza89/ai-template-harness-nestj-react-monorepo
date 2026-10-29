"""Audita o formato das skills em .claude/skills/ contra as regras da documentação oficial.

Fontes:
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
  (name e description, corpo do SKILL.md abaixo de 500 linhas, sumário em referência longa)
- https://yaml.org/spec/1.2.2/#733-plain-style (o que quebra um escalar sem aspas)

Uso: python3 check-skills.py [--raiz DIR]. Sai com 1 se houver erro.
Só biblioteca padrão: o PyYAML não é garantido na máquina nem na CI, e o frontmatter das
skills usa um subconjunto pequeno (chave: valor em uma linha).
"""

import argparse
import pathlib
import re
import sys

# Limites da página de best practices (seção "Skill structure" e "Token budgets").
NAME_MAX = 64
DESCRIPTION_MAX = 1024
BODY_MAX_LINES = 500
# "For reference files longer than 100 lines, include a table of contents at the top."
REFERENCE_TOC_FROM = 100
# Até onde procurar o sumário: título, uma ou duas linhas de abertura e o cabeçalho.
TOC_WINDOW = 20

NAME_RE = re.compile(r"^[a-z0-9-]+$")
RESERVED = ("anthropic", "claude")
XML_TAG = re.compile(r"<[A-Za-z/][^>]*>")
TOC_HEADING = re.compile(r"^## (Sumário|Índice|Conteúdo)\s*$")
# Indicadores que não podem abrir um escalar sem aspas (YAML 1.2, seção 7.3.3).
PLAIN_START = set("-?:,[]{}#&*!|>'\"%@`")

errors = []


def err(path, msg):
    errors.append(f"{path}: {msg}")


def frontmatter(path, text):
    lines = text.split("\n")
    if not lines or lines[0] != "---":
        err(path, "sem frontmatter: a primeira linha precisa ser '---'")
        return None, []
    try:
        end = lines.index("---", 1)
    except ValueError:
        err(path, "frontmatter sem o '---' de fechamento")
        return None, []
    fields = {}
    for n, line in enumerate(lines[1:end], start=2):
        if not line.strip() or line.startswith((" ", "\t")):
            continue  # continuação de valor aninhado (metadata, hooks): fora do escopo
        key, sep, value = line.partition(":")
        if not sep:
            err(path, f"linha {n} do frontmatter não é 'chave: valor'")
            continue
        fields[key.strip()] = (n, value.strip())
    return fields, lines[end + 1:]


def scalar(path, key, n, raw):
    """Devolve o valor como o YAML o leria, ou None com erro registrado."""
    if not raw:
        err(path, f"{key} vazio (linha {n})")
        return None
    if raw[0] in "\"'":
        q = raw[0]
        if len(raw) < 2 or raw[-1] != q:
            err(path, f"{key} abre aspas {q} e não fecha na mesma linha (linha {n})")
            return None
        inner = raw[1:-1]
        # Entre aspas duplas, " interno precisa de \; entre simples, ' interno se dobra ('').
        loose = re.search(r'(?<!\\)"', inner) if q == '"' else re.search(r"(?<!')'(?!')", inner)
        if loose:
            err(path, f"{key} tem {q} sem escape na coluna {loose.start() + 2} (linha {n})")
            return None
        return inner.replace('\\"', '"') if q == '"' else inner.replace("''", "'")
    if raw[0] in "|>":
        err(path, f"{key} em bloco ({raw[0]}): escreva em uma linha só (linha {n})")
        return None
    if raw[0] in PLAIN_START:
        err(path, f"{key} começa com '{raw[0]}', que o YAML lê como indicador; use aspas (linha {n})")
        return None
    if ": " in raw or raw.endswith(":"):
        col = raw.find(": ")
        err(path, f"{key} tem ': ' (coluna {col + 1}), que o YAML lê como nova chave; troque por ' - ' (linha {n})")
        return None
    if " #" in raw:
        col = raw.find(" #")
        err(path, f"{key} tem ' #' (coluna {col + 1}), que o YAML lê como comentário e corta o resto (linha {n})")
        return None
    return raw


def check_skill(skill_dir):
    md = skill_dir / "SKILL.md"
    rel = md.relative_to(root)
    if not md.is_file():
        err(skill_dir.relative_to(root), "pasta de skill sem SKILL.md")
        return
    fields, body = frontmatter(rel, md.read_text(encoding="utf-8"))
    if fields is None:
        return

    if "name" not in fields:
        err(rel, "frontmatter sem name")
    else:
        name = scalar(rel, "name", *fields["name"])
        if name is not None:
            if len(name) > NAME_MAX:
                err(rel, f"name com {len(name)} caracteres; o máximo é {NAME_MAX}")
            if not NAME_RE.match(name):
                err(rel, f"name '{name}' fora de [a-z0-9-]")
            if any(w in name for w in RESERVED):
                err(rel, f"name '{name}' usa palavra reservada ({', '.join(RESERVED)})")
            if name != skill_dir.name:
                err(rel, f"name '{name}' diferente da pasta '{skill_dir.name}'")

    if "description" not in fields:
        err(rel, "frontmatter sem description")
    else:
        desc = scalar(rel, "description", *fields["description"])
        if desc is not None:
            if len(desc) > DESCRIPTION_MAX:
                err(rel, f"description com {len(desc)} caracteres; o máximo é {DESCRIPTION_MAX}")
            tag = XML_TAG.search(desc)
            if tag:
                err(rel, f"description com tag XML '{tag.group()}'; a doc proíbe tags na description")

    # A última linha vazia depois do texto não conta.
    n_body = len(body) - (1 if body and body[-1] == "" else 0)
    if n_body >= BODY_MAX_LINES:
        err(rel, f"corpo com {n_body} linhas; mantenha abaixo de {BODY_MAX_LINES} e mova detalhe para references/")

    for ref in sorted((skill_dir / "references").glob("*.md")):
        lines = ref.read_text(encoding="utf-8").split("\n")
        n = len(lines) - (1 if lines and lines[-1] == "" else 0)
        if n > REFERENCE_TOC_FROM and not any(TOC_HEADING.match(l) for l in lines[:TOC_WINDOW]):
            err(ref.relative_to(root), f"{n} linhas sem '## Sumário' nas primeiras {TOC_WINDOW}")


parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
parser.add_argument("--raiz", default=".", help="raiz do repositório (padrão: diretório atual)")
args = parser.parse_args()
root = pathlib.Path(args.raiz).resolve()
skills = root / ".claude" / "skills"
dirs = sorted(d for d in skills.iterdir() if d.is_dir()) if skills.is_dir() else []
for d in dirs:
    check_skill(d)

for e in errors:
    print(f"erro: {e}", file=sys.stderr)
if errors:
    sys.exit(1)
print(f"ok: {len(dirs)} skills em .claude/skills no formato da doc oficial")
