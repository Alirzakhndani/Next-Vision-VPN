import { createWriteStream, existsSync, mkdirSync, rmSync } from "node:fs";
import { chmod, copyFile, mkdtemp, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const DEFAULT_XRAY_URL = "https://github.com/XTLS/Xray-core/releases/latest/download/Xray-windows-64.zip";
const CORE_URL = process.env.XRAY_CORE_URL || DEFAULT_XRAY_URL;
const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUTPUT_DIR = resolve(PROJECT_ROOT, "bin");
const OUTPUT_EXE = join(OUTPUT_DIR, process.platform === "win32" ? "xray.exe" : "xray");

async function download(url, destination) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  await pipeline(response.body, createWriteStream(destination));
}

async function extractZip(zipPath, destination) {
  const command = process.platform === "win32" ? "powershell" : "unzip";
  const args = process.platform === "win32"
    ? ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`]
    : ["-q", zipPath, "-d", destination];

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function findXrayExecutable(dir) {
  const entries = await readdir(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      const nested = await findXrayExecutable(fullPath);
      if (nested) return nested;
    }
    if (/^xray(\.exe)?$/i.test(entry)) return fullPath;
  }
  return null;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  if (existsSync(OUTPUT_EXE)) {
    console.log(`Xray core already exists at ${OUTPUT_EXE}`);
    return;
  }

  const workDir = await mkdtemp(join(tmpdir(), "next-vision-xray-"));
  const zipPath = join(workDir, "xray.zip");

  console.log(`Downloading Xray core from ${CORE_URL}`);
  await download(CORE_URL, zipPath);
  await extractZip(zipPath, workDir);

  const extractedExe = await findXrayExecutable(workDir);
  if (!extractedExe) throw new Error("Downloaded Xray archive did not contain xray.exe");

  await copyFile(extractedExe, OUTPUT_EXE);
  await chmod(OUTPUT_EXE, 0o755);
  rmSync(workDir, { recursive: true, force: true });

  console.log(`Installed Xray core to ${OUTPUT_EXE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
