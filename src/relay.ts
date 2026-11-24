/**
 * Management of the bundled local relay.
 *
 * The relay is spawned lazily on the first provider request of a session and
 * killed at session shutdown (only when this Pi process owns it). If another
 * process already serves the port (e.g. a second Pi instance or a manually
 * started relay), the existing relay is adopted and left alone.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:http";

let child: ChildProcess | null = null;
let owned = false;

export function findRelayScript(): string {
  const candidates: string[] = [];
  try {
    candidates.push(fileURLToPath(new URL("../relay/relay.py", import.meta.url)));
  } catch {
    // import.meta.url unavailable in this loader; try the other candidates
  }
  if (typeof __dirname !== "undefined") {
    candidates.push(join(__dirname, "../relay/relay.py"));
  }
  candidates.push(join(process.cwd(), "relay/relay.py"));
  candidates.push(join(homedir(), ".pi/agent/extensions/pi-letaicode/relay/relay.py"));
  return candidates.find((p) => existsSync(p)) ?? candidates[0]!;
}

export function isRelayHealthy(port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const req = get(
      { host: "127.0.0.1", port, path: "/healthz", timeout: timeoutMs },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Ensure a relay answers on `port`. Returns once the relay is up; throws a
 * descriptive error when python3 is missing or the port cannot be served.
 */
export async function ensureRelay(port: number, script: string): Promise<void> {
  // Fast path: we already own a live relay process.
  if (owned && child && child.exitCode === null) return;
  // Fast path: something else already serves the port (adopt, don't touch).
  if (await isRelayHealthy(port)) return;

  let spawnError: Error | null = null;
  const py = spawn("python3", [script, String(port)], { stdio: "ignore" });
  py.once("error", (err) => {
    spawnError = err;
  });
  child = py;
  owned = true;
  py.on("exit", () => {
    if (owned) {
      owned = false;
      child = null;
    }
  });

  for (let i = 0; i < 40; i++) {
    if (await isRelayHealthy(port, 300)) return;
    if (spawnError || py.exitCode !== null) break;
    await sleep(150);
  }
  // The port may have been won by a concurrently started relay.
  if (await isRelayHealthy(port)) return;

  owned = false;
  child = null;
  throw new Error(
    `LetAiCode relay failed to start on port ${port}. ` +
      (spawnError
        ? `Could not launch python3: ${spawnError.message}. `
        : "Relay exited before becoming healthy. ") +
      "Install python3 and curl, or run /letaicode-relay status for details.",
  );
}

export function stopRelay(): void {
  if (owned && child) {
    child.kill();
  }
  owned = false;
  child = null;
}
