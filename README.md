# Next Vision VPN

Next Vision VPN is a desktop React + Electron VPN client for PC. It imports V2Ray/Xray configs (`vmess://`, `vless://`, `trojan://`, `ss://`, or outbound JSON), starts an installed Xray/V2Ray core, and exposes local proxies for desktop use.

## Requirements

- Node.js 20+
- Xray or V2Ray installed on the computer
  - Put `xray`/`v2ray` in `PATH`, or set `NEXTVISION_CORE_PATH` to the executable path.

## Run in development

```bash
npm install
npm run electron:dev
```

If your machine has a broken npm proxy and `npm install` returns `403 Forbidden`, use the included public-registry installer:

```bash
npm run install:public
```

That script unsets `npm_config_http_proxy`, `npm_config_https_proxy`, `HTTP_PROXY`, and `HTTPS_PROXY`, then installs from `https://registry.npmjs.org/`.

## Build the desktop app

```bash
npm run build
npm run dist:win
```

The Windows installer and unpacked app will be created under `release/`.

## Publish automatically to a new GitHub repo

1. Install and authenticate GitHub CLI:

   ```bash
   gh auth login
   ```

2. Run the publishing script with your target repo name:

   ```bash
   ./scripts/publish-to-github.sh YOUR_GITHUB_USERNAME/next-vision-vpn main
   ```

The script creates the repo if it does not exist, sets `origin`, pushes the code, and GitHub Actions builds the Windows PC app automatically.

## Automatic Windows builds

This repository includes `.github/workflows/build-desktop.yml`. On push, pull request, manual workflow dispatch, or a `v*` tag, GitHub Actions:

1. Installs dependencies from the public npm registry.
2. Builds the Vite renderer.
3. Packages the Windows Electron app.
4. Uploads the installer/build output as a workflow artifact.
5. Publishes a GitHub Release automatically for tags like `v3.0.0`.

## How it connects

1. Open **Settings → Import Config**.
2. Paste one or more V2Ray links or an outbound JSON config.
3. Import the configs and connect from **Server Nodes** or **Quick Connect**.
4. When connected, the app starts:
   - SOCKS proxy: `127.0.0.1:10808`
   - HTTP proxy: `127.0.0.1:10809`

Configure your browser/system proxy to use one of those local proxy endpoints.
