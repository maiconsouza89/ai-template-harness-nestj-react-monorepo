#!/bin/sh
# Aplica no repositório do GitHub tudo que "Use this template" não copia:
# configurações de PR, auto-merge, permissão das Actions e ruleset de main.
# Idempotente: pode rodar de novo. Requer gh autenticado com acesso de admin ao repositório.
#
# Uso: sh scripts/templates/bootstrap-github.sh [owner/repo]   (padrão: o remoto origin)
set -eu

repo="${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
echo "bootstrap: $repo"

echo "- pull requests: só squash, título e corpo do PR, apaga branch, auto-merge"
gh api -X PATCH "repos/$repo" \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true -F allow_auto_merge=true \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY >/dev/null

echo "- actions: podem criar pull requests (fallback sem RELEASE_PLEASE_TOKEN)"
gh api -X PUT "repos/$repo/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true >/dev/null

echo "- ruleset main: sem exclusão, sem force push, PR obrigatório, checks check e pr-title"
ruleset='{
  "name": "main", "target": "branch", "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false, "require_last_push_approval": false,
        "required_review_thread_resolution": false, "allowed_merge_methods": ["squash"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false, "do_not_enforce_on_create": false,
        "required_status_checks": [ { "context": "check" }, { "context": "pr-title" } ] } }
  ]
}'
existing=$(gh api "repos/$repo/rulesets" --jq '.[] | select(.name=="main") | .id' | head -n 1)
if [ -n "$existing" ]; then
  printf '%s' "$ruleset" | gh api -X PUT "repos/$repo/rulesets/$existing" --input - >/dev/null
else
  printf '%s' "$ruleset" | gh api -X POST "repos/$repo/rulesets" --input - >/dev/null
fi

if gh secret list --repo "$repo" | grep -q '^RELEASE_PLEASE_TOKEN'; then
  echo "- secret RELEASE_PLEASE_TOKEN: presente"
else
  printf '%s\n' "- secret RELEASE_PLEASE_TOKEN: AUSENTE. Sem ele o PR de release fica para merge manual." \
    "  Crie um token fine-grained (Contents e Pull requests em leitura e escrita) em" \
    "  https://github.com/settings/personal-access-tokens/new e cadastre com:" \
    "  gh secret set RELEASE_PLEASE_TOKEN --repo $repo"
fi
echo "ok: bootstrap concluído"
