#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-../Next-Vision-VPN-clean}"
BRANCH="${2:-main}"
COMMIT_MESSAGE="${3:-Initial final PC app version}"

if [[ -e "$TARGET_DIR" ]]; then
  echo "Target directory already exists: $TARGET_DIR" >&2
  echo "Choose a new path or remove the existing directory." >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"

git archive --format=tar HEAD | tar -x -C "$TARGET_DIR"

git -C "$TARGET_DIR" init -b "$BRANCH"
git -C "$TARGET_DIR" add -A
git -C "$TARGET_DIR" commit -m "$COMMIT_MESSAGE"

echo "Clean repository created at: $TARGET_DIR"
echo "Next steps:"
echo "  cd '$TARGET_DIR'"
echo "  git remote add origin https://github.com/YOUR_USER/YOUR_NEW_REPO.git"
echo "  git push -u origin $BRANCH"
