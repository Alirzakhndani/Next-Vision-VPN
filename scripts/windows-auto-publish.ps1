<#
.SYNOPSIS
  One-command Windows helper to publish Next Vision VPN to GitHub and trigger the PC build workflow.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\windows-auto-publish.ps1 -Repo "YOUR_USER/next-vision-vpn"

.NOTES
  This script runs on YOUR Windows PC. The agent cannot remote into your machine from this sandbox.
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Repo,

  [string]$Branch = "main",
  [switch]$Private = $true,
  [switch]$SkipInstall,
  [switch]$TagRelease,
  [string]$ReleaseTag = "v3.0.0"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Require-Command([string]$Name, [string]$InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is not installed. $InstallHint"
  }
}

Write-Step "Checking required tools"
Require-Command git "Install Git for Windows: https://git-scm.com/download/win"
Require-Command node "Install Node.js 20 LTS: https://nodejs.org/"
Require-Command npm "Install Node.js 20 LTS: https://nodejs.org/"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Step "Installing GitHub CLI with winget"
    winget install --id GitHub.cli --exact --accept-source-agreements --accept-package-agreements
  }
  Require-Command gh "Install GitHub CLI: https://cli.github.com/"
}

Write-Step "Logging in to GitHub if needed"
try {
  gh auth status | Out-Null
} catch {
  gh auth login
}

if (-not $SkipInstall) {
  Write-Step "Installing npm dependencies from the public registry"
  Remove-Item Env:\npm_config_http_proxy -ErrorAction SilentlyContinue
  Remove-Item Env:\npm_config_https_proxy -ErrorAction SilentlyContinue
  Remove-Item Env:\npm_config_proxy -ErrorAction SilentlyContinue
  Remove-Item Env:\HTTP_PROXY -ErrorAction SilentlyContinue
  Remove-Item Env:\HTTPS_PROXY -ErrorAction SilentlyContinue
  Remove-Item Env:\http_proxy -ErrorAction SilentlyContinue
  Remove-Item Env:\https_proxy -ErrorAction SilentlyContinue
  npm install --registry=https://registry.npmjs.org/
}

Write-Step "Running a local renderer build check"
npm run build

Write-Step "Preparing GitHub repository $Repo"
$repoExists = $true
try {
  gh repo view $Repo | Out-Null
} catch {
  $repoExists = $false
}

if (-not $repoExists) {
  $visibility = if ($Private) { "--private" } else { "--public" }
  gh repo create $Repo $visibility --description "Next Vision VPN desktop app for V2Ray/Xray configs" --source=. --remote=origin --push
} else {
  $remoteUrl = "https://github.com/$Repo.git"
  $hasOrigin = $true
  try {
    git remote get-url origin | Out-Null
  } catch {
    $hasOrigin = $false
  }
  if ($hasOrigin) {
    git remote set-url origin $remoteUrl
  } else {
    git remote add origin $remoteUrl
  }
}

Write-Step "Pushing code to GitHub"
git branch -M $Branch
git push -u origin $Branch

if ($TagRelease) {
  Write-Step "Creating and pushing release tag $ReleaseTag"
  git tag -f $ReleaseTag
  git push origin $ReleaseTag --force
}

Write-Step "Done"
Write-Host "Repo: https://github.com/$Repo" -ForegroundColor Green
Write-Host "Open GitHub > Actions > Build desktop app > download the next-vision-vpn-windows artifact." -ForegroundColor Green
if ($TagRelease) {
  Write-Host "Release will be created from tag $ReleaseTag when the workflow finishes." -ForegroundColor Green
}
