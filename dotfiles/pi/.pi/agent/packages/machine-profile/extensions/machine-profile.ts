import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const MACHINE_PROFILE = `
<machine-profile>
Local machine preferences and resources:
- Dotfiles means any non-secret user/system configuration file for this machine, not only hidden files.
- Dotfiles live in ~/src/dotfiles and are managed with GNU stow.
- For config/dotfile changes, edit ~/src/dotfiles rather than managed files in their deployed locations when possible.
- Secrets storage is excluded: do not put tokens, private keys, credentials, password-store data, or sensitive material in dotfiles.
- After updating dotfiles, apply with stow as appropriate, review the dotfiles repo diff, then commit and push unless the user says not to.
- Third-party reference source lives in ~/reference/external_src/.
- Third-party reference docs live in ~/reference/external_docs/.
- When asked to download source/docs for reference, store them in those reference directories.
- When uncertain about third-party library/API behavior, check local reference source/docs before guessing.
- Do not store secrets in dotfiles, notes, prompts, skills, or reference docs.
</machine-profile>`;

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    return { systemPrompt: `${event.systemPrompt}\n\n${MACHINE_PROFILE}` };
  });
}
