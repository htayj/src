# Crush OpenAI Codex provider

This directory configures Charmbracelet Crush to use the local Codex CLI ChatGPT OAuth login as an `openai-codex` provider.

## Files

- `crush.json` adds provider `openai-codex` and points Crush at `https://chatgpt.com/backend-api/codex`.
- `~/.local/bin/crush-openai-codex-auth` reads and refreshes the local Codex CLI OAuth login and prints only the requested field for Crush command expansion.
- `~/.local/bin/crush` wraps the upstream npm-installed Crush entrypoint and passes `--yolo` by default.

## Credentials

Credentials stay in `~/.codex/auth.json`, which is created and owned by Codex CLI. The dotfiles repo stores no access token, refresh token, API key, private key, or copied auth JSON.

If authentication stops working, refresh the Codex login with:

```sh
codex login
```

You can check non-secret helper status with:

```sh
crush-openai-codex-auth status
```

## Default yolo mode

The `crush` wrapper defaults interactive Crush launches to `--yolo`, so tool permission prompts are auto-accepted. To launch with prompts restored, pass an explicit yolo flag value:

```sh
crush --yolo=false
```

The wrapper calls `/home/tay/.local/lib/node_modules/@charmland/crush/run-crush.js` directly and can be pointed elsewhere with `CRUSH_UPSTREAM_BIN`.

## Validation

After stowing these dotfiles, useful checks are:

```sh
jq empty ~/.config/crush/crush.json
crush-openai-codex-auth status
crush models | grep -F 'openai-codex/gpt-5.5'
crush --help | grep -F -- '--yolo'
crush run --model openai-codex/gpt-5.5 'reply with only OK'
```

Do not run Crush with debug HTTP logging while sharing logs unless Authorization and token-bearing headers have been redacted.
