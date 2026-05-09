---
description: Change dotfiles using the local stow-managed dotfiles workflow
argument-hint: "<change description>"
---
Use `/skill:dotfiles-workflow` and make this dotfiles/config change: $ARGUMENTS

Remember: dotfiles means any non-secret config file for this machine. They live in `~/src/dotfiles`, are managed with `stow`, and should be committed and pushed after updates unless I say not to. Secrets storage is excluded.
