#!/usr/bin/env bash
set -euo pipefail

TARGET_BRANCH="${1:-main}"
REMOTE="${2:-origin}"
CONFLICT_FILES=(
  ".gitignore"
  "NextVisionVPN.jsx"
  "README.md"
  "electron/main.cjs"
  "package.json"
)

CURRENT_BRANCH="$(git branch --show-current)"
if [[ -z "$CURRENT_BRANCH" ]]; then
  echo "You must be on the branch that contains the final Next Vision VPN app." >&2
  exit 1
fi

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "Remote '$REMOTE' does not exist. Add it first, for example:" >&2
  echo "  git remote add origin https://github.com/YOUR_USER/next-vision-vpn.git" >&2
  exit 1
fi

git fetch "$REMOTE" "$TARGET_BRANCH"

set +e
git merge --no-ff --no-commit "$REMOTE/$TARGET_BRANCH"
MERGE_STATUS=$?
set -e

if [[ $MERGE_STATUS -ne 0 ]]; then
  echo "Merge conflicts detected. Keeping the final app version for known conflicted files..."
  for file in "${CONFLICT_FILES[@]}"; do
    if git ls-files --unmerged -- "$file" | grep -q .; then
      git checkout --ours -- "$file"
      git add "$file"
      echo "Resolved with current branch version: $file"
    fi
  done
fi

if git ls-files --unmerged | grep -q .; then
  echo "There are still unresolved conflicts:" >&2
  git diff --name-only --diff-filter=U >&2
  echo "Resolve those files manually, then run git add/commit." >&2
  exit 1
fi

if git diff --cached --quiet && git diff --quiet; then
  echo "No merge changes were needed. Pushing current branch..."
else
  git add -A
  git commit -m "Resolve GitHub merge conflicts for final PC app"
fi

git push "$REMOTE" "$CURRENT_BRANCH"

echo "Done. Refresh the GitHub PR page; the conflict warning should be gone."
