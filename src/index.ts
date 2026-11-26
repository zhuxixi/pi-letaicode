/**
 * pi-letaicode — LetAiCode (letaicode.cn) provider extension.
 *
 * Registers four providers (one per LetAiCode key type), all speaking the
 * OpenAI Chat Completions format against the site's /codex base:
 *
 *   letaicode-claude  CLAUDECODE key   Claude Opus/Fable/Sonnet/Haiku family
 *   letaicode-codex   CODEX key        GPT-6.x / GPT-5.6 family + image models
 *   letaicode-gemini  GEMINI key       Gemini 4/3.x family
 *   letaicode-guomo   GUOMO key        DeepSeek / Kimi / GLM / MiniMax / Qwen / Hunyuan
 *
 * Model catalog: fetched from the site's public pricing endpoint at startup
 * and on model refresh, so new models appear without updating the extension.
 * A curated static snapshot is the offline fallback.
 *
 * Relay: letaicode.cn's Cloudflare WAF blocks Node/Python TLS fingerprints on
 * the API routes; curl passes. A bundled curl-based relay is started lazily on
 * the first request of a session (default port 18081). Set LETAICODE_DIRECT=1
 * to point at letaicode.cn directly instead.
 *
 * Keys: store them per provider via `pi login` or the /login command.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  buildModels,
  fetchCatalog,
  STATIC_CATALOG,
  type CatalogModel,
  type KeyType,
} from "./catalog.ts";
import { ensureRelay, findRelayScript, isRelayHealthy, stopRelay } from "./relay.ts";

const DIRECT = process.env.LETAICODE_DIRECT === "1";
const OFFLINE = process.env.LETAICODE_OFFLINE === "1";
const PORT = Number(process.env.LETAICODE_RELAY_PORT ?? "18081");
const RELAY_URL = `http://127.0.0.1:${PORT}`;
const DIRECT_URL = "https://letaicode.cn/codex";
const BROWSER_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const PROVIDERS: Array<{ id: string; name: string; keyType: KeyType }> = [
  { id: "letaicode-claude", name: "LetAiCode Claude", keyType: "CLAUDECODE" },
  { id: "letaicode-codex", name: "LetAiCode Codex", keyType: "CODEX" },
  { id: "letaicode-gemini", name: "LetAiCode Gemini", keyType: "GEMINI" },
  { id: "letaicode-guomo", name: "LetAiCode 国产", keyType: "GUOMO" },
];

export default async function (pi: ExtensionAPI) {
  let catalog: CatalogModel[] | null = null;
  if (!OFFLINE) catalog = await fetchCatalog();
  if (!catalog || catalog.length === 0) catalog = STATIC_CATALOG;

  const baseUrl = DIRECT ? DIRECT_URL : RELAY_URL;

  for (const provider of PROVIDERS) {
    pi.registerProvider(provider.id, {
      name: provider.name,
      baseUrl,
      api: "openai-completions",
      ...(DIRECT ? { headers: { "User-Agent": BROWSER_UA } } : {}),
      models: buildModels(catalog, provider.keyType),
      async refreshModels({ signal }: { signal: AbortSignal }) {
        const fresh = OFFLINE ? null : await fetchCatalog(signal);
        return buildModels(fresh ?? STATIC_CATALOG, provider.keyType);
      },
    });
  }

  if (!DIRECT) {
    const relayScript = findRelayScript();

    // Lazily start the relay before the first request of each session.
    // The event carries only headers, so the provider is read from the
    // context; when it is unavailable, ensure the relay anyway (safe: it is
    // only reachable at 127.0.0.1 and never sees traffic from other providers).
    pi.on("before_provider_headers", async (_event, ctx) => {
      const provider = (ctx.model as { provider?: string } | undefined)?.provider;
      if (typeof provider === "string" && !provider.startsWith("letaicode-")) return;
      await ensureRelay(PORT, relayScript);
    });

    // Kill the relay we own when the session ends.
    pi.on("session_shutdown", () => {
      stopRelay();
    });

    pi.registerCommand("letaicode-relay", {
      description: "Manage the LetAiCode local relay (status | start | stop)",
      handler: async (args) => {
        const action = String(args ?? "").trim().split(/\s+/)[0] || "status";
        switch (action) {
          case "status": {
            const healthy = await isRelayHealthy(PORT);
            return [
              `Mode: relay (set LETAICODE_DIRECT=1 for direct mode)`,
              `URL: ${RELAY_URL}`,
              `Status: ${healthy ? "healthy" : "not running"}`,
            ].join("\n");
          }
          case "start": {
            await ensureRelay(PORT, relayScript);
            return `Relay started on ${RELAY_URL}`;
          }
          case "stop": {
            stopRelay();
            return "Relay stopped.";
          }
          default:
            return "Usage: /letaicode-relay [status|start|stop]";
        }
      },
    });
  }
}
