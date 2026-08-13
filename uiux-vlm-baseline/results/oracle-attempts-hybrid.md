# Oracle attempts for hybrid VLM/CV design

Date: 2026-05-25

The user requested using Oracle for the hybrid VLM/CV design. I attempted both the Pi Oracle MCP tool and the local Oracle CLI.

## Attempts

1. `oracle_consult` browser mode, GPT-5.5 Pro Extended, with project files attached.
   - Result: failed with `connect ECONNREFUSED 127.0.0.1:9222`.

2. `oracle_consult` API mode.
   - Result: failed because `OPENAI_API_KEY` is not set.

3. Local CLI dry run via `xvfb-run -a npx -y @steipete/oracle --dry-run summary ...`.
   - Result: dry run succeeded; prompt/files would be ~17,702 tokens.

4. Local CLI browser run via `xvfb-run -a npx -y @steipete/oracle --engine browser ...`.
   - Result: failed with `No ChatGPT cookies were applied from your Chrome profile; cannot proceed in browser mode`.

5. Retried local CLI browser run with `--browser-cookie-wait 5s`.
   - Result: same cookie failure.

## Decision

Oracle is currently unavailable in this environment because neither API credentials nor usable ChatGPT browser cookies are present. The hybrid design/implementation proceeds with a recorded Oracle-attempt artifact and local verification/code review.
