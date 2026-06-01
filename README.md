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

## Build the desktop app

```bash
npm run build
npm run dist
```

## How it connects

1. Open **Settings → Import Config**.
2. Paste one or more V2Ray links or an outbound JSON config.
3. Import the configs and connect from **Server Nodes** or **Quick Connect**.
4. When connected, the app starts:
   - SOCKS proxy: `127.0.0.1:10808`
   - HTTP proxy: `127.0.0.1:10809`

Configure your browser/system proxy to use one of those local proxy endpoints.
