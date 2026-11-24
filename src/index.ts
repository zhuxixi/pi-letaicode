/**
 * LetAiCode (letaicode.cn) provider extension.
 *
 * Initial port of the author's local setup:
 * - Two providers (Claude family + Codex family) behind a local relay.
 * - The relay is required because letaicode.cn's Cloudflare WAF blocks
 *   Node/Python TLS fingerprints on the API routes; curl passes.
 *
 * Usage: run relay/relay.py on 127.0.0.1:18080, then `pi login` per provider.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const RELAY_BASE_URL = "http://127.0.0.1:18080";

export default function (pi: ExtensionAPI) {
  pi.registerProvider("letaicode-claude", {
    name: "LetAiCode Claude",
    baseUrl: RELAY_BASE_URL,
    api: "anthropic-messages",
    models: [
      {
        id: "claude-opus-5",
        name: "Claude Opus 5 (LetAiCode)",
        reasoning: true,
        thinkingLevelMap: { xhigh: "xhigh", max: "max" },
        input: ["text", "image"],
        contextWindow: 1000000,
        maxTokens: 128000,
        cost: { input: 5, output: 25, cacheRead: 0, cacheWrite: 0 },
      },
      {
        id: "claude-fable-5",
        name: "Claude Fable 5 (LetAiCode)",
        reasoning: true,
        thinkingLevelMap: { off: null, xhigh: "xhigh", max: "max" },
        input: ["text", "image"],
        contextWindow: 1000000,
        maxTokens: 128000,
        cost: { input: 10, output: 100, cacheRead: 0, cacheWrite: 0 },
      },
      {
        id: "claude-opus-4-8",
        name: "Claude Opus 4.8 (LetAiCode)",
        reasoning: true,
        thinkingLevelMap: { xhigh: "xhigh", max: "max" },
        input: ["text", "image"],
        contextWindow: 1000000,
        maxTokens: 128000,
        cost: { input: 5, output: 25, cacheRead: 0, cacheWrite: 0 },
      },
    ],
  });

  pi.registerProvider("letaicode-codex", {
    name: "LetAiCode Codex",
    baseUrl: RELAY_BASE_URL,
    api: "openai-completions",
    models: [
      {
        id: "gpt-5.6-sol",
        name: "GPT-5.6 Sol (LetAiCode)",
        reasoning: true,
        thinkingLevelMap: {
          off: "none",
          minimal: null,
          low: "low",
          medium: "medium",
          high: "high",
          xhigh: "xhigh",
          max: "max",
        },
        input: ["text", "image"],
        contextWindow: 1000000,
        maxTokens: 128000,
        cost: { input: 5, output: 30, cacheRead: 0, cacheWrite: 0 },
      },
      {
        id: "gpt-6-astra",
        name: "GPT-6 Astra (LetAiCode)",
        reasoning: true,
        thinkingLevelMap: {
          off: null,
          minimal: null,
          low: "low",
          medium: "medium",
          high: "high",
          xhigh: "xhigh",
          max: "max",
        },
        input: ["text", "image"],
        contextWindow: 1050000,
        cost: { input: 10, output: 50, cacheRead: 0, cacheWrite: 0 },
      },
    ],
  });
}
