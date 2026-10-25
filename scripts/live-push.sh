#!/usr/bin/env bash
# Run a command and push the bot data every LIVE_PUSH_SECONDS while it runs, so the website shows the game live
# (the full push still happens in the workflow's "Push data" step).
#   scripts/live-push.sh npm run play -- --mode mainnet ...
set -uo pipefail
every="${LIVE_PUSH_SECONDS:-60}"
"$@" &
cmd=$!
(
  # the pusher stops on its own once the command is gone (never killed mid-push)
  t=0
  while kill -0 "$cmd" 2>/dev/null; do
    sleep 5
    t=$((t + 5))
    if [ "$t" -ge "$every" ] && kill -0 "$cmd" 2>/dev/null; then
      t=0
      scripts/data-branch.sh push "live ${GITHUB_RUN_ID:-}" >/dev/null 2>&1 || true
    fi
  done
) &
pusher=$!
wait "$cmd"
status=$?
wait "$pusher"
exit $status
