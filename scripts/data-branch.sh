#!/usr/bin/env bash
# Bot data lives on its own branch (bot-data) so gameplay logs never clutter the code history.
#   scripts/data-branch.sh checkout   -> worktree at ./botdata (created as an orphan branch the first time)
#   scripts/data-branch.sh push "msg" -> commit ./botdata and push (retries on races / network errors)
set -euo pipefail
BRANCH="${DATA_BRANCH:-bot-data}"
DIR="${DATA_WORKTREE:-botdata}"

git config user.name  "${GIT_AUTHOR_NAME:-loot-survivor-bot}"
git config user.email "${GIT_AUTHOR_EMAIL:-loot-survivor-bot@users.noreply.github.com}"

case "${1:-}" in
  checkout)
    if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
      git fetch --depth=1 origin "$BRANCH:refs/remotes/origin/$BRANCH"
      git worktree add -B "$BRANCH" "$DIR" "origin/$BRANCH"
    else
      git worktree add --orphan -b "$BRANCH" "$DIR"
    fi
    mkdir -p "$DIR/data"
    ;;
  push)
    msg="${2:-bot data}"
    cd "$DIR"
    git add -A
    if git diff --cached --quiet; then echo "no data changes"; exit 0; fi
    git commit -q -m "$msg"
    for i in 1 2 3 4 5; do
      if git push -q origin "HEAD:$BRANCH"; then echo "data pushed"; exit 0; fi
      sleep $((2 ** i))
      git fetch -q origin "$BRANCH" && git rebase -q -X theirs "origin/$BRANCH" || true
    done
    echo "push failed" >&2; exit 1
    ;;
  *) echo "usage: $0 checkout|push [message]" >&2; exit 2 ;;
esac
