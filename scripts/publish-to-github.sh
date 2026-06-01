#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <github-owner/new-repo-name> [branch]" >&2
  echo "Example: $0 my-user/next-vision-vpn main" >&2
  exit 1
fi

REPO="$1"
BRANCH="${2:-main}"
REMOTE_URL="https://github.com/${REPO}.git"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install it and run: gh auth login" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --private --description "Next Vision VPN desktop app for V2Ray/Xray configs" --source=. --remote=origin --push
else
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$REMOTE_URL"
  else
    git remote add origin "$REMOTE_URL"
  fi
fi

git branch -M "$BRANCH"
git push -u origin "$BRANCH"

echo "Published to ${REMOTE_URL}"
echo "GitHub Actions will build Windows artifacts from .github/workflows/build-desktop.yml."
