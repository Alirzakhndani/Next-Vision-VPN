<#
.SYNOPSIS
  Resolve GitHub PR conflicts by merging the target branch and keeping the final app files from the current branch.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\resolve-github-conflicts.ps1 -TargetBranch main
#>
param(
  [string]$TargetBranch = "main",
  [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"

$ConflictFiles = @(
  ".gitignore",
  "NextVisionVPN.jsx",
  "README.md",
  "electron/main.cjs",
  "package.json"
)

$CurrentBranch = (git branch --show-current).Trim()
if (-not $CurrentBranch) {
  throw "You must be on the branch that contains the final Next Vision VPN app."
}

try {
  git remote get-url $Remote | Out-Null
} catch {
  throw "Remote '$Remote' does not exist. Add it first: git remote add origin https://github.com/YOUR_USER/next-vision-vpn.git"
}

git fetch $Remote $TargetBranch

$mergeFailed = $false
try {
  git merge --no-ff --no-commit "$Remote/$TargetBranch"
} catch {
  $mergeFailed = $true
}

if ($mergeFailed) {
  Write-Host "Merge conflicts detected. Keeping the final app version for known conflicted files..." -ForegroundColor Yellow
  foreach ($file in $ConflictFiles) {
    $unmerged = git ls-files --unmerged -- $file
    if ($unmerged) {
      git checkout --ours -- $file
      git add $file
      Write-Host "Resolved with current branch version: $file" -ForegroundColor Green
    }
  }
}

$remaining = git ls-files --unmerged
if ($remaining) {
  Write-Host "There are still unresolved conflicts:" -ForegroundColor Red
  git diff --name-only --diff-filter=U
  throw "Resolve the remaining files manually, then run git add/commit."
}

git diff --cached --quiet
$hasCached = $LASTEXITCODE -ne 0
git diff --quiet
$hasWorktree = $LASTEXITCODE -ne 0

if ($hasCached -or $hasWorktree) {
  git add -A
  git commit -m "Resolve GitHub merge conflicts for final PC app"
} else {
  Write-Host "No merge changes were needed. Pushing current branch..." -ForegroundColor Cyan
}

git push $Remote $CurrentBranch
Write-Host "Done. Refresh the GitHub PR page; the conflict warning should be gone." -ForegroundColor Green
