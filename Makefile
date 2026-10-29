# Superfície única de comandos para pessoas e agentes. A lógica fica em scripts/.
# Alvos documentados com "## " aparecem em `make help`.

SHELL := /bin/sh
.DEFAULT_GOAL := help

.PHONY: help setup check check-branch check-hooks check-eol check-shell check-actions check-secrets check-adr \
	check-prd check-hld check-c4 check-spec check-eval check-validators check-skills check-claude-hooks lint format test build

help: ## Lista os alvos disponíveis
	@grep -E '^[a-zA-Z_ -]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  %-14s %s\n", $$1, $$2}'

setup: ## Ativa os hooks versionados (uma vez após o clone)
	@sh scripts/setup.sh

check: check-branch check-hooks check-eol check-shell check-actions check-secrets check-adr check-prd check-hld check-c4 check-spec check-eval check-validators check-skills check-claude-hooks lint test ## Roda todas as verificações
	@echo "ok: todas as verificações passaram"

check-branch: ## Valida o nome do branch (<tipo>/<descricao>)
	@sh scripts/checks/check-branch.sh

check-hooks: ## Testa o hook commit-msg com cabeçalhos válidos e inválidos
	@sh scripts/tests/test-commit-msg.sh

check-eol: ## Garante que nenhum arquivo versionado tem CRLF
	@sh scripts/checks/check-eol.sh

check-shell: ## Valida a sintaxe dos scripts sh (e shellcheck, se instalado)
	@sh scripts/checks/check-shell.sh

check-actions: ## Valida os workflows do GitHub Actions (actionlint)
	@sh scripts/checks/check-actions.sh

check-secrets: ## Procura segredos no histórico do Git (gitleaks)
	@sh scripts/checks/check-secrets.sh

check-adr: ## Audita os ADRs em docs/architecture/adr e regenera o índice (adr-writer)
	@sh scripts/checks/check-adr.sh

check-prd: ## Valida docs/product/prd.md e regenera o roadmap (prd-writer)
	@sh scripts/checks/check-prd.sh

check-hld: ## Valida docs/architecture/hld.md contra o PRD e os ADRs (hld-writer)
	@sh scripts/checks/check-hld.sh

check-c4: ## Valida os diagramas C4 em docs/architecture/diagrams (c4-writer)
	@sh scripts/checks/check-c4.sh

check-spec: ## Valida as specs, planos e contratos em docs/features (spec-writer)
	@sh scripts/checks/check-spec.sh

check-eval: ## Valida avaliacao.md e orquestracao.md em docs/features contra o roadmap (evaluator)
	@sh scripts/checks/check-eval.sh

check-validators: ## Testa os validadores das skills com casos aceitos e rejeitados
	@sh scripts/tests/test-skill-validators.sh

check-skills: ## Audita o formato das skills em .claude/skills contra a doc oficial
	@sh scripts/checks/check-skills.sh

check-claude-hooks: ## Testa os hooks do Claude Code em .claude/hooks com casos aceitos e rejeitados
	@sh scripts/tests/test-claude-hooks.sh

# Contrato de alvos, igual em qualquer stack. Cada projeto gerado implementa scripts/<alvo>.sh;
# sem o script, contract.sh avisa e passa. check inclui lint e test; format e build são manuais.
lint format test build: ## Alvos do contrato da stack (scripts/<alvo>.sh)
	@sh scripts/contract.sh $@
