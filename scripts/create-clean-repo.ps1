<#
.SYNOPSIS
  Create a new clean Git repository from the current final app version.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\create-clean-repo.ps1 -TargetDir ..\Next-Vision-VPN-clean -Branch main
#>
param(
  [string]$TargetDir = "..\Next-Vision-VPN-clean",
  [string]$Branch = "main",
  [string]$CommitMessage = "Initial final PC app version"
)

$ErrorActionPreference = "Stop"

if (Test-Path $TargetDir) {
  throw "Target directory already exists: $TargetDir. Choose a new path or remove the existing directory."
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

git archive --format=tar HEAD | tar -x -C $TargetDir

git -C $TargetDir init -b $Branch
git -C $TargetDir add -A
git -C $TargetDir commit -m $CommitMessage

Write-Host "Clean repository created at: $TargetDir" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  cd $TargetDir"
Write-Host "  git remote add origin https://github.com/YOUR_USER/YOUR_NEW_REPO.git"
Write-Host "  git push -u origin $Branch"
