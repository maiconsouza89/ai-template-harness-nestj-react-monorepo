"""Hooks do Claude Code deste repositório. Lê o JSON do evento no stdin.

Uso (via run.sh, chamado por .claude/settings.json):
  python3 hooks.py subagent   SubagentStop: roda make lint e make test se o subagente editou código

Exit 2 bloqueia e o stderr vira a mensagem que o Claude recebe; exit 0 deixa seguir.
Documentação: https://code.claude.com/docs/en/hooks
"""

import json
import os
import subprocess
import sys

# Ferramentas que editam arquivo; edição por Bash (sed -i) não aparece aqui.
EDIT_TOOLS = {"Edit", "Write", "NotebookEdit"}
# Linhas finais da saída do make que voltam ao subagente: o erro costuma estar no fim.
TAIL_LINES = 40


def edited_code(transcript, root):
    """Caminhos editados pelo subagente fora de docs/ (documentação não passa por lint e test)."""
    paths = []
    try:
        lines = open(transcript, encoding="utf-8")
    except OSError:
        return paths
    with lines:
        for line in lines:
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            message = entry.get("message")
            content = message.get("content") if isinstance(message, dict) else None
            for item in content if isinstance(content, list) else []:
                if not isinstance(item, dict) or item.get("type") != "tool_use" or item.get("name") not in EDIT_TOOLS:
                    continue
                path = (item.get("input") or {}).get("file_path") or (item.get("input") or {}).get("notebook_path")
                if not path:
                    continue
                rel = os.path.relpath(path, root) if os.path.isabs(path) else path
                if not rel.startswith("docs" + os.sep):
                    paths.append(rel)
    return paths


def hook_subagent(event):
    if event.get("stop_hook_active"):
        return 0  # já bloqueou uma vez: deixa encerrar, para falha que não é do subagente não virar laço
    cwd = event.get("cwd") or os.getcwd()
    try:
        root = subprocess.run(
            ["git", "-C", cwd, "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return 0
    if not edited_code(event.get("agent_transcript_path") or "", root):
        return 0
    for target in ("lint", "test"):
        run = subprocess.run(["make", target], cwd=root, capture_output=True, text=True)
        if run.returncode != 0:
            tail = "\n".join((run.stdout + run.stderr).strip().split("\n")[-TAIL_LINES:])
            print(
                f"`make {target}` falhou depois das suas edições. Corrija e rode `make lint` e "
                f"`make test` de novo antes de encerrar. Se a falha já existia antes e não é do "
                f"seu código, registre como falha anterior no retorno, com a evidência.\n\n{tail}",
                file=sys.stderr,
            )
            return 2
    return 0


def main():
    try:
        event = json.load(sys.stdin)
    except ValueError:
        return 0  # entrada que não é JSON: o hook não é o lugar de travar a sessão
    hooks = {"subagent": hook_subagent}
    if len(sys.argv) != 2 or sys.argv[1] not in hooks:
        print(f"uso: hooks.py {{{'|'.join(hooks)}}}", file=sys.stderr)
        return 1
    return hooks[sys.argv[1]](event)


if __name__ == "__main__":
    sys.exit(main())
