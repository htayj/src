# .bash_profile

# Get the aliases and functions
if [ -f ~/.bashrc ]; then
	. ~/.bashrc
fi

# User specific environment and startup programs


# BEGIN opam configuration
# This is useful if you're using opam as it adds:
#   - the correct directories to the PATH
#   - auto-completion for the opam binary
# This section can be safely removed at any time if needed.
test -r '/home/tay/.opam/opam-init/init.sh' && . '/home/tay/.opam/opam-init/init.sh' > /dev/null 2> /dev/null || true
# END opam configuration

if [ -e /home/tay/.nix-profile/etc/profile.d/nix.sh ]; then . /home/tay/.nix-profile/etc/profile.d/nix.sh; fi # added by Nix installer

# Added by LM Studio CLI (lms)
export PATH="$PATH:/home/tay/.lmstudio/bin"
# End of LM Studio CLI section



# Added by Antigravity CLI installer
export PATH="/home/tay/.local/bin:$PATH"
