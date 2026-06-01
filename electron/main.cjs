const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

let mainWindow;
let coreProcess = null;
let currentConfigPath = null;
let currentServer = null;
let lastError = null;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: "Next Vision VPN",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#060c1a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function coreCandidates() {
  const envPath = process.env.NEXTVISION_CORE_PATH;
  const names = process.platform === "win32" ? ["xray.exe", "v2ray.exe", "xray", "v2ray"] : ["xray", "v2ray"];
  const bundledDir = process.resourcesPath ? path.join(process.resourcesPath, "bin") : path.join(__dirname, "bin");
  return [envPath, ...names.map((name) => path.join(bundledDir, name)), ...names].filter(Boolean);
}

function streamSettings(server) {
  const network = server.net || server.network || "tcp";
  const tlsEnabled = server.tls || server.security === "tls" || server.security === "reality";
  const settings = { network };

  if (network === "ws") {
    settings.wsSettings = {
      path: server.path || "/",
      headers: server.host ? { Host: server.host } : {},
    };
  }
  if (network === "grpc") {
    settings.grpcSettings = { serviceName: server.serviceName || server.grpcService || "" };
  }
  if (network === "h2" || network === "http") {
    settings.httpSettings = { path: server.path || "/", host: server.host ? [server.host] : [] };
  }
  if (tlsEnabled) {
    settings.security = server.security === "reality" ? "reality" : "tls";
    settings.tlsSettings = {
      serverName: server.sni || server.host || server.address,
      allowInsecure: Boolean(server.allowInsecure),
      fingerprint: server.fingerprint || "chrome",
    };
    if (server.alpn) settings.tlsSettings.alpn = Array.isArray(server.alpn) ? server.alpn : String(server.alpn).split(",");
  }
  return settings;
}

function outboundFromServer(server, appSettings = {}) {
  const protocol = String(server.proto || server.protocol || "").toLowerCase();
  const address = server.address || server.add || server.host;
  const port = Number(server.port);

  if (!address || !port) {
    throw new Error("Config is missing server address or port.");
  }

  if (protocol === "vmess") {
    return {
      protocol: "vmess",
      settings: {
        vnext: [{
          address,
          port,
          users: [{
            id: server.uuid || server.id,
            alterId: Number(server.alterId || server.aid || 0),
            security: server.encryption || server.scy || "auto",
          }],
        }],
      },
      streamSettings: streamSettings(server),
      tag: "proxy",
      mux: appSettings.mux ? { enabled: true, concurrency: Number(appSettings.muxConcurrency || 8) } : undefined,
    };
  }

  if (protocol === "vless") {
    return {
      protocol: "vless",
      settings: {
        vnext: [{
          address,
          port,
          users: [{
            id: server.uuid || server.id,
            encryption: server.encryption || "none",
            flow: server.flow && server.flow !== "none" ? server.flow : undefined,
          }],
        }],
      },
      streamSettings: streamSettings(server),
      tag: "proxy",
      mux: appSettings.mux ? { enabled: true, concurrency: Number(appSettings.muxConcurrency || 8) } : undefined,
    };
  }

  if (protocol === "trojan") {
    return {
      protocol: "trojan",
      settings: { servers: [{ address, port, password: server.password || server.uuid }] },
      streamSettings: streamSettings({ ...server, tls: server.tls !== false }),
      tag: "proxy",
      mux: appSettings.mux ? { enabled: true, concurrency: Number(appSettings.muxConcurrency || 8) } : undefined,
    };
  }

  if (protocol === "shadowsocks" || protocol === "ss") {
    return {
      protocol: "shadowsocks",
      settings: {
        servers: [{
          address,
          port,
          method: server.method || "aes-256-gcm",
          password: server.password || server.uuid,
        }],
      },
      tag: "proxy",
      mux: appSettings.mux ? { enabled: true, concurrency: Number(appSettings.muxConcurrency || 8) } : undefined,
    };
  }

  throw new Error(`Unsupported protocol: ${server.proto || server.protocol}`);
}

function buildConfig(server, settings = {}) {
  return {
    log: { loglevel: settings.logLevel || "warning" },
    dns: { servers: [settings.dns || "1.1.1.1"] },
    inbounds: [
      {
        listen: "127.0.0.1",
        port: Number(settings.socksPort || 10808),
        protocol: "socks",
        settings: { auth: "noauth", udp: true },
        sniffing: settings.sniff ? { enabled: true, destOverride: ["http", "tls", "quic"] } : undefined,
        tag: "socks-in",
      },
      {
        listen: "127.0.0.1",
        port: Number(settings.httpPort || 10809),
        protocol: "http",
        sniffing: settings.sniff ? { enabled: true, destOverride: ["http", "tls", "quic"] } : undefined,
        tag: "http-in",
      },
    ],
    outbounds: [outboundFromServer(server, settings), { protocol: "freedom", tag: "direct" }, { protocol: "blackhole", tag: "block" }],
    routing: {
      domainStrategy: "IPIfNonMatch",
      rules: settings.smartRoute ? [{ type: "field", ip: ["geoip:private"], outboundTag: "direct" }] : [],
    },
  };
}

function stopCore() {
  if (coreProcess) {
    coreProcess.removeAllListeners();
    coreProcess.kill();
    coreProcess = null;
  }
  currentServer = null;
}

ipcMain.handle("vpn:status", () => ({ connected: Boolean(coreProcess), server: currentServer, error: lastError }));

ipcMain.handle("vpn:disconnect", () => {
  stopCore();
  return { ok: true };
});

ipcMain.handle("vpn:connect", async (_event, server, settings) => {
  stopCore();
  lastError = null;

  const config = buildConfig(server, settings);
  const dir = path.join(os.tmpdir(), "next-vision-vpn");
  fs.mkdirSync(dir, { recursive: true });
  currentConfigPath = path.join(dir, "config.json");
  fs.writeFileSync(currentConfigPath, JSON.stringify(config, null, 2));

  const candidates = coreCandidates();
  let launchError = null;

  for (const candidate of candidates) {
    const args = ["run", "-config", currentConfigPath];
    const proc = spawn(candidate, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });

    const started = await new Promise((resolve) => {
      let done = false;
      const finish = (result) => {
        if (!done) {
          done = true;
          resolve(result);
        }
      };
      proc.once("error", (error) => finish({ ok: false, error }));
      proc.once("spawn", () => setTimeout(() => finish({ ok: true }), 900));
      proc.once("exit", (code) => finish({ ok: false, error: new Error(`Core exited during startup with code ${code}`) }));
    });

    if (started.ok && !proc.killed) {
      coreProcess = proc;
      currentServer = server;
      proc.stderr.on("data", (chunk) => { lastError = chunk.toString(); });
      proc.on("exit", () => { coreProcess = null; currentServer = null; });
      return {
        ok: true,
        configPath: currentConfigPath,
        localSocks: `127.0.0.1:${settings.socksPort || 10808}`,
        localHttp: `127.0.0.1:${settings.httpPort || 10809}`,
        core: candidate,
      };
    }

    launchError = started.error;
    if (!proc.killed) proc.kill();
  }

  const message = `Could not start Xray/V2Ray core. Install xray or v2ray and add it to PATH, or set NEXTVISION_CORE_PATH. Last error: ${launchError?.message || "not found"}`;
  lastError = message;
  throw new Error(message);
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", stopCore);
app.on("window-all-closed", () => {
  stopCore();
  if (process.platform !== "darwin") app.quit();
});
