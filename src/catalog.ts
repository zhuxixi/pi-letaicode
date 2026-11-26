/**
 * LetAiCode model catalog.
 *
 * The site exposes a public, login-free catalog endpoint
 * (https://callyouai.com/api/promotions/model-pricing). The extension fetches
 * it at startup and during model refresh so new models appear without an
 * extension update. STATIC_CATALOG is a curated snapshot used when the fetch
 * fails or LETAICODE_OFFLINE=1.
 *
 * Price units: the site bills Claude/Codex/Gemini models in USD per million
 * tokens and 国产 models in CNY per million tokens. CNY is converted to USD
 * with the site's own rate (7) so Pi's cost tracking stays in USD.
 */

export type KeyType = "CLAUDECODE" | "CODEX" | "GEMINI" | "GUOMO";

export interface CatalogModel {
  modelId: string;
  keyType: KeyType;
  inputPrice: number | null;
  outputPrice: number | null;
  supportsImages: boolean;
  /** Image-generation models exposed through the chat-completions format. */
  isImageModel?: boolean;
}

interface CuratedMeta {
  name: string;
  reasoning: boolean;
  thinkingLevelMap?: Record<string, string | null>;
  contextWindow?: number;
  /** Output cap; null means unlimited (field omitted). */
  maxTokens?: number | null;
  input: string[];
  isImageModel?: boolean;
}

const USD_TO_CNY = 7; // site's usdToCnyRate

/** thinkingLevelMap proven against the site's openai-completions endpoint. */
const TLM_GPT: Record<string, string | null> = {
  off: "none",
  minimal: null,
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "xhigh",
  max: "max",
};
const TLM_CLAUDE: Record<string, string | null> = { xhigh: "xhigh", max: "max" };
const TLM_GEMINI: Record<string, string | null> = {
  off: "none",
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "xhigh",
  max: "max",
};
const TLM_DEEPSEEK: Record<string, string | null> = { high: "high", max: "max" };
const TLM_GUOMO: Record<string, string | null> = {
  off: "none",
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "xhigh",
  max: "max",
};

const IMAGE_INPUT = ["text"];
const CHAT_INPUT = ["text", "image"];
const DEFAULT_CONTEXT_WINDOW = 1000000;
const DEFAULT_MAX_TOKENS = 128000;

/** Curated metadata for known models; unknown models get safe defaults. */
const CURATED: Record<string, CuratedMeta> = {
  // Claude key (CLAUDECODE)
  "claude-opus-5": { name: "Claude Opus 5", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-fable-5-2": { name: "Claude Fable 5.2", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-fable-5-1": { name: "Claude Fable 5.1", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-opus-5-5": { name: "Claude Opus 5.5", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-fable-5": { name: "Claude Fable 5", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-opus-4-8": { name: "Claude Opus 4.8", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-opus-4-7": { name: "Claude Opus 4.7", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-opus-4-6": { name: "Claude Opus 4.6", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-sonnet-4-6": { name: "Claude Sonnet 4.6", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-opus-4-5": { name: "Claude Opus 4.5", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-sonnet-4-5": { name: "Claude Sonnet 4.5", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-haiku-4-5": { name: "Claude Haiku 4.5", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-sonnet-5-5": { name: "Claude Sonnet 5.5", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  "claude-sonnet-5": { name: "Claude Sonnet 5", reasoning: true, thinkingLevelMap: TLM_CLAUDE, input: CHAT_INPUT },
  // Codex key (CODEX)
  "gpt-6.2-astra": { name: "GPT-6.2 Astra", reasoning: true, thinkingLevelMap: TLM_GPT, contextWindow: 1050000, input: CHAT_INPUT },
  "gpt-6.2-sol": { name: "GPT-6.2 Sol", reasoning: true, thinkingLevelMap: TLM_GPT, input: CHAT_INPUT },
  "gpt-6.1-terra": { name: "GPT-6.1 Terra", reasoning: true, thinkingLevelMap: TLM_GPT, input: CHAT_INPUT },
  "gpt-6.1-sol": { name: "GPT-6.1 Sol", reasoning: true, thinkingLevelMap: TLM_GPT, input: CHAT_INPUT },
  "gpt-6-sol": { name: "GPT-6 Sol", reasoning: true, thinkingLevelMap: TLM_GPT, input: CHAT_INPUT },
  "gpt-6-astra": { name: "GPT-6 Astra", reasoning: true, thinkingLevelMap: TLM_GPT, contextWindow: 1050000, input: CHAT_INPUT },
  "gpt-5.6-sol": { name: "GPT-5.6 Sol", reasoning: true, thinkingLevelMap: TLM_GPT, input: CHAT_INPUT },
  "gpt-5.6-terra": { name: "GPT-5.6 Terra", reasoning: true, thinkingLevelMap: TLM_GPT, input: CHAT_INPUT },
  "gpt-5.6-luna": { name: "GPT-5.6 Luna", reasoning: true, thinkingLevelMap: TLM_GPT, input: CHAT_INPUT },
  "gpt-image-2.5-flare": { name: "GPT Image 2.5 Flare", reasoning: false, input: IMAGE_INPUT, isImageModel: true },
  "gpt-image-2.5-sunburst": { name: "GPT Image 2.5 Sunburst", reasoning: false, input: IMAGE_INPUT, isImageModel: true },
  "gpt-image-2": { name: "GPT Image 2", reasoning: false, input: IMAGE_INPUT, isImageModel: true },
  // Gemini key (GEMINI)
  "gemini-4-argon": { name: "Gemini 4 Argon", reasoning: true, thinkingLevelMap: TLM_GEMINI, input: CHAT_INPUT },
  "gemini-3.8-flash": { name: "Gemini 3.8 Flash", reasoning: true, thinkingLevelMap: TLM_GEMINI, input: CHAT_INPUT },
  "gemini-3.1-pro-preview": { name: "Gemini 3.1 Pro Preview", reasoning: true, thinkingLevelMap: TLM_GEMINI, input: CHAT_INPUT },
  // 国产 key (GUOMO)
  "deepseek-v4.1-flash-1017": { name: "DeepSeek V4.1 Flash 1017", reasoning: true, thinkingLevelMap: TLM_DEEPSEEK, input: CHAT_INPUT },
  "deepseek-v4.1-flash": { name: "DeepSeek V4.1 Flash", reasoning: true, thinkingLevelMap: TLM_DEEPSEEK, input: CHAT_INPUT },
  "deepseek-v4-pro-0813": { name: "DeepSeek V4 Pro 0813", reasoning: true, thinkingLevelMap: TLM_DEEPSEEK, input: CHAT_INPUT },
  "deepseek-v4-flash-0731": { name: "DeepSeek V4 Flash 0731", reasoning: true, thinkingLevelMap: TLM_DEEPSEEK, input: CHAT_INPUT },
  "kimi-k3": { name: "Kimi K3", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
  "kimi-k2.8": { name: "Kimi K2.8", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
  "glm-5.3-flash": { name: "GLM 5.3 Flash", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
  "glm-5.3": { name: "GLM 5.3", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
  "glm-5.2": { name: "GLM 5.2", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
  "minimax-m3.1-flash": { name: "MiniMax M3.1 Flash", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
  "minimax-m3": { name: "MiniMax M3", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
  "qwen3.8-max": { name: "Qwen 3.8 Max", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
  "hy4-preview": { name: "Hunyuan Hy4 Preview", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
  "hy3": { name: "Hunyuan Hy3", reasoning: true, thinkingLevelMap: TLM_GUOMO, input: CHAT_INPUT },
};

/** Static snapshot of the site catalog (fetched 2026-11-24). */
export const STATIC_CATALOG: CatalogModel[] = [
  // Claude key (CLAUDECODE)
  ...claude("claude-opus-5", 4, 20), ...claude("claude-fable-5-2", 8, 40),
  ...claude("claude-fable-5-1", 10, 50), ...claude("claude-opus-5-5", 4, 20),
  ...claude("claude-fable-5", 10, 100), ...claude("claude-opus-4-8", 5, 25),
  ...claude("claude-opus-4-7", 5, 25), ...claude("claude-opus-4-6", 5, 25),
  ...claude("claude-sonnet-4-6", 3, 15), ...claude("claude-opus-4-5", 5, 25),
  ...claude("claude-sonnet-4-5", 2, 10), ...claude("claude-haiku-4-5", 1, 5),
  ...claude("claude-sonnet-5-5", 2, 10), ...claude("claude-sonnet-5", 2, 10),
  ...claude("gpt-image-2.5-sunburst", 1.2, 1.2),
  // Codex key (CODEX)
  ...codex("gpt-6.2-astra", 8, 40), ...codex("gpt-6.2-sol", 2, 10),
  ...codex("gpt-6.1-terra", 1, 5), ...codex("gpt-6.1-sol", 2, 10),
  ...codex("gpt-6-sol", 2, 10), ...codex("gpt-6-astra", 10, 50),
  ...codex("gpt-5.6-sol", 5, 30), ...codex("gpt-5.6-terra", 2, 12),
  ...codex("gpt-5.6-luna", 2, 12), ...codex("gpt-image-2.5-flare", 1.2, 1.2),
  ...codex("gpt-image-2", 1.2, 1.2),
  // Gemini key (GEMINI)
  ...gemini("gemini-4-argon", 2, 10), ...gemini("gemini-3.8-flash", 0.75, 3.75),
  ...gemini("gemini-3.1-pro-preview", 2, 12),
  // 国产 key (GUOMO, CNY per M tokens)
  ...guomo("deepseek-v4.1-flash-1017", 0.14285714285714285, 0.5714285714285714),
  ...guomo("deepseek-v4.1-flash", 0.14285714285714285, 0.5714285714285714),
  ...guomo("deepseek-v4-pro-0813", 0.6428571428571429, 1.9285714285714286),
  ...guomo("deepseek-v4-flash-0731", 0.14285714285714285, 0.5714285714285714),
  ...guomo("kimi-k3", 2.857142857142857, 14.285714285714286),
  ...guomo("kimi-k2.8", 0.9285714285714286, 3.857142857142857),
  ...guomo("glm-5.3-flash", 0.14285714285714285, 0.4785714285714286),
  ...guomo("glm-5.3", 1.1428571428571428, 4),
  ...guomo("glm-5.2", 1.1428571428571428, 4),
  ...guomo("minimax-m3.1-flash", 0.14285714285714285, 0.5714285714285714),
  ...guomo("minimax-m3", 0.3, 1.2),
  ...guomo("qwen3.8-max", 1.7142857142857142, 5.142857142857143),
  ...guomo("hy4-preview", 0.8571428571428571, 2.5714285714285716),
  ...guomo("hy3", 0.14285714285714285, 0.5714285714285714),
];

function claude(modelId: string, inputPrice: number, outputPrice: number): CatalogModel[] {
  return [{ modelId, keyType: "CLAUDECODE", inputPrice, outputPrice, supportsImages: true }];
}

function codex(modelId: string, inputPrice: number, outputPrice: number): CatalogModel[] {
  return [{ modelId, keyType: "CODEX", inputPrice, outputPrice, supportsImages: true }];
}

function gemini(modelId: string, inputPrice: number, outputPrice: number): CatalogModel[] {
  return [{ modelId, keyType: "GEMINI", inputPrice, outputPrice, supportsImages: true }];
}

function guomo(modelId: string, inputPrice: number, outputPrice: number): CatalogModel[] {
  return [{ modelId, keyType: "GUOMO", inputPrice, outputPrice, supportsImages: true }];
}

const CATALOG_URL = "https://callyouai.com/api/promotions/model-pricing";
const FETCH_TIMEOUT_MS = 5000;

interface ApiModel {
  id: string;
  modelId: string;
  keyType: string;
  inputUsdPerMTokens: number | null;
  outputUsdPerMTokens: number | null;
  supportsImages: boolean;
  enabled?: boolean;
}

interface ApiGroup {
  models?: ApiModel[];
}

/** Fetch the live catalog. Returns null on any failure (offline, blocked). */
export async function fetchCatalog(signal?: AbortSignal): Promise<CatalogModel[] | null> {
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const res = await fetch(CATALOG_URL, { signal: combined });
    if (!res.ok) return null;
    const payload = (await res.json()) as { success?: boolean; data?: { groups?: ApiGroup[] } };
    if (!payload?.success || !payload.data?.groups) return null;
    const out: CatalogModel[] = [];
    for (const group of payload.data.groups) {
      for (const m of group.models ?? []) {
        if (m.enabled === false) continue;
        if (!m.modelId || !m.keyType) continue;
        if (m.modelId.startsWith("text-embedding-")) continue; // Pi has no embedding support
        const keyType = m.keyType as KeyType;
        if (!["CLAUDECODE", "CODEX", "GEMINI", "GUOMO"].includes(keyType)) continue;
        out.push({
          modelId: m.modelId,
          keyType,
          inputPrice: m.inputUsdPerMTokens ?? 0,
          outputPrice: m.outputUsdPerMTokens ?? 0,
          supportsImages: m.supportsImages === true,
          isImageModel: m.modelId.startsWith("gpt-image"),
        });
      }
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

function prettify(modelId: string): string {
  return modelId
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

/** Build Pi model definitions for one key type. */
export function buildModels(catalog: CatalogModel[], keyType: KeyType) {
  const models = [];
  for (const entry of catalog) {
    if (entry.keyType !== keyType) continue;
    const curated = CURATED[entry.modelId] ?? {
      name: prettify(entry.modelId),
      reasoning: !entry.modelId.startsWith("gpt-image"),
      thinkingLevelMap: TLM_GUOMO,
      input: entry.supportsImages ? CHAT_INPUT : ["text"],
      isImageModel: entry.modelId.startsWith("gpt-image"),
    };
    const isImage = curated.isImageModel ?? false;
    const costUsd =
      keyType === "GUOMO"
        ? {
            input: round4((entry.inputPrice ?? 0) / USD_TO_CNY),
            output: round4((entry.outputPrice ?? 0) / USD_TO_CNY),
          }
        : { input: entry.inputPrice ?? 0, output: entry.outputPrice ?? 0 };

    const model: Record<string, unknown> = {
      id: entry.modelId,
      name: curated.name,
      reasoning: isImage ? false : curated.reasoning,
      input: curated.input,
      contextWindow: curated.contextWindow ?? DEFAULT_CONTEXT_WINDOW,
      cost: { input: costUsd.input, output: costUsd.output, cacheRead: 0, cacheWrite: 0 },
    };
    // maxTokens: number = explicit cap; null = unlimited (omit the field).
    if (curated.maxTokens !== null) model.maxTokens = curated.maxTokens ?? DEFAULT_MAX_TOKENS;
    if (!isImage && curated.thinkingLevelMap) model.thinkingLevelMap = curated.thinkingLevelMap;
    models.push(model);
  }
  // Stable order: curated order first, then new models alphabetically.
  const order = Object.keys(CURATED);
  models.sort((a, b) => {
    const ia = order.indexOf(String(a.id));
    const ib = order.indexOf(String(b.id));
    if (ia === -1 && ib === -1) return String(a.id).localeCompare(String(b.id));
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return models;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
