#!/bin/sh
# Confere o compose.yaml renderizado pelo próprio Compose: serviço com interface de administração
# sem login publica as portas só no loopback do host. Hoje é o observability (Grafana do
# grafana/otel-lgtm com acesso anônimo de admin): publicado em todas as interfaces, qualquer
# máquina da rede local editaria painéis, regras de alerta e fontes de dados.
# Uso: check-compose.sh [arquivo-compose]; sem argumento, confere o compose.yaml da raiz.
set -eu
cd "$(git rev-parse --show-toplevel)"
root=$(pwd)
file=${1:-compose.yaml}
loopback_only="observability"

command -v docker >/dev/null 2>&1 || {
  echo "check-compose: docker não encontrado; a verificação renderiza o compose com docker compose config" >&2
  exit 1
}
command -v node >/dev/null 2>&1 || {
  echo "check-compose: node não encontrado" >&2
  exit 1
}

rendered=$(docker compose -f "$file" --project-directory "$root" --profile observability config --format json) || {
  echo "check-compose: docker compose config falhou para $file" >&2
  exit 1
}

printf '%s' "$rendered" | LOOPBACK_ONLY="$loopback_only" node -e '
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const services = JSON.parse(raw).services ?? {};
  const errors = [];
  for (const name of process.env.LOOPBACK_ONLY.split(" ")) {
    const svc = services[name];
    if (!svc) {
      errors.push(`serviço ${name} ausente`);
      continue;
    }
    for (const p of svc.ports ?? []) {
      if (p.host_ip !== "127.0.0.1") {
        errors.push(`${name} publica ${p.published}:${p.target} em ${p.host_ip || "todas as interfaces"}; use 127.0.0.1:${p.published}:${p.target}`);
      }
    }
  }
  if (errors.length) {
    console.error("check-compose: porta de interface sem login fora do loopback:\n" + errors.join("\n"));
    process.exit(1);
  }
  console.log("ok: portas de " + process.env.LOOPBACK_ONLY + " presas ao loopback");
});
'
