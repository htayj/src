# Clawmacs network approvals / sandbox notes

This file is for imagegen CLI mode. Read it only after `scripts/image_gen.py` fails because the active harness cannot access the network or needs approval for networked commands.

This guidance is intentionally isolated from `SKILL.md` because it can vary by environment and may become stale. Prefer the defaults in your environment when in doubt.

## Why am I asked to approve image generation calls?

The CLI uses the OpenAI Image API, so it needs outbound network access. In sandboxed setups, network access may be disabled by default or may require user approval before commands can connect externally.

## Important note about approvals vs network

- Approval prompts and network enablement are separate controls.
- Approving one command does not necessarily grant persistent network access.
- If network remains unavailable, ask the user how they want Clawmacs configured for networked provider/API calls.

## How to reduce repeated approval prompts

If the user trusts the repo and wants fewer prompts, use a configuration/profile that both enables network access for the active sandbox and applies an approval policy that matches their risk tolerance.

## Safety note

Enabling network and reducing approvals lowers friction, but increases risk if untrusted code or an untrusted repository can run commands.
