# pi-letaicode

Pi extension for [LetAiCode](https://callyouai.com) (letaicode.cn) models.
Install once, log in with your key(s), and use the whole catalog — when the
site adds models, they show up automatically, no reconfiguration needed.

## What you get

| Provider            | Key type  | Models                                                              |
| ------------------- | --------- | ------------------------------------------------------------------- |
| `letaicode-claude`  | Claude    | Claude Opus 5 / 5.5, Fable 5 / 5.1 / 5.2, Opus 4.5–4.8, Sonnet 4.5–5.5, Haiku 4.5 |
| `letaicode-codex`   | Codex     | GPT-6.2 / 6.1 / 6 / 5.6 (Sol, Terra, Luna, Astra) + GPT Image models |
| `letaicode-gemini`  | Gemini    | Gemini 4 Argon, Gemini 3.8 Flash, Gemini 3.1 Pro Preview             |
| `letaicode-guomo`   | 国产模型   | DeepSeek V4.1 / V4, Kimi K3 / K2.8, GLM 5.3 / 5.2, MiniMax M3.x, Qwen 3.8 Max, Hunyuan Hy4 / Hy3 |

Vector models (text-embedding-3-*) are listed on the site but Pi has no
embedding support yet, so they are excluded.

## How it works

- **One API format for everything.** All models accept OpenAI Chat
  Completions on `https://letaicode.cn/codex`, so the extension registers
  four thin providers, one per key type.
- **Live catalog.** The site serves a public pricing endpoint
  (`/api/promotions/model-pricing`). The extension fetches it at Pi startup
  and on model refresh; new models appear without an extension update. A
  curated snapshot is bundled as the offline fallback
  (`LETAICODE_OFFLINE=1` skips the fetch entirely).
- **Bundled relay.** letaicode.cn's Cloudflare WAF blocks the TLS
  fingerprints of Node/Python HTTP clients; `curl` passes. The extension
  therefore ships a small curl-based relay (`relay/relay.py`, default port
  `18081`) and starts it automatically on the first request of a session. It
  needs `python3` and `curl` on PATH. If your network is not affected by the
  WAF, set `LETAICODE_DIRECT=1` to talk to letaicode.cn directly.

## Setup

1. Install the extension (pick one):

   ```bash
   # A) symlink into the extensions dir
   ln -s "$(pwd)" ~/.pi/agent/extensions/pi-letaicode

   # B) or load per session
   pi -e /path/to/pi-letaicode
   ```

2. Create an API key for each key type you want on the LetAiCode site
   (充值 → API keys; the site calls the types Claude Code / Codex / Gemini /
   国产模型).

3. Store the keys:

   ```bash
   pi login letaicode-claude
   pi login letaicode-codex
   pi login letaicode-gemini
   pi login letaicode-guomo
   ```

   (Only the providers you use need a key; /login in the TUI works too.)

4. Pick a model with `/model`.

Prerequisites for relay mode: `python3` and `curl` installed. Check status
with `/letaicode-relay status`.

## Environment variables

| Variable                 | Default | Effect                                            |
| ------------------------ | ------- | ------------------------------------------------- |
| `LETAICODE_DIRECT`       | unset   | `1` = connect to letaicode.cn directly, no relay  |
| `LETAICODE_RELAY_PORT`   | `18081` | Local port for the bundled relay                  |
| `LETAICODE_OFFLINE`      | unset   | `1` = never fetch the live catalog                |

## Commands

- `/letaicode-relay status` — relay mode, URL, liveness
- `/letaicode-relay start` / `stop` — manual control

## Migrating from a manual models.json setup

If you previously configured `letaicode-*` providers in `models.json`,
remove those blocks: `models.json` overrides win over extension
registrations, and the extension replaces them entirely.

## Notes

- The Claude/Codex/Gemini prices are USD per M tokens; 国产 prices are
  converted from CNY with the site's rate (7) for cost tracking.
- Image models (`gpt-image-*`) are exposed through the chat-completions
  format and included; treat them as experimental in Pi.
- The relay only forwards requests to `letaicode.cn`; your API key is sent
  by Pi with every request and never stored by the extension.
