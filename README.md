# pi-letaicode

Pi extension for [LetAiCode](https://callyouai.com) (letaicode.cn) models.

Initial commit: port of a working local setup (Claude + Codex families via a
local relay). Full catalog integration follows.

## Setup

1. Copy or symlink this directory into `~/.pi/agent/extensions/`.
2. Start the relay (required: letaicode.cn's WAF blocks Node/Python TLS
   fingerprints, curl passes):

   ```bash
   python3 relay/relay.py
   ```

3. Store your keys:

   ```bash
   pi login letaicode-claude
   pi login letaicode-codex
   ```

4. Pick a model with `/model`.
