// Lógica do check-compose.sh: lê da entrada padrão o compose renderizado em JSON
// (docker compose config --format json) e confere que cada serviço passado como argumento
// publica as portas só em 127.0.0.1.
// Uso: docker compose config --format json | node check-compose.mjs "<serviço> [serviço...]"
const loopbackOnly = process.argv.slice(2).join(" ").split(/\s+/).filter(Boolean);

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const services = JSON.parse(raw).services ?? {};
  const errors = [];
  for (const name of loopbackOnly) {
    const svc = services[name];
    if (!svc) {
      errors.push(`serviço ${name} ausente`);
      continue;
    }
    for (const p of svc.ports ?? []) {
      if (p.host_ip !== "127.0.0.1") {
        errors.push(
          `${name} publica ${p.published}:${p.target} em ${p.host_ip || "todas as interfaces"}; use 127.0.0.1:${p.published}:${p.target}`,
        );
      }
    }
  }
  if (errors.length) {
    console.error(`check-compose: porta de interface sem login fora do loopback:\n${errors.join("\n")}`);
    process.exit(1);
  }
  console.log(`ok: portas de ${loopbackOnly.join(" ")} presas ao loopback`);
});
