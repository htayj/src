# .bashrc

# Source global definitions
if [ -f /etc/bashrc ]; then
	. /etc/bashrc
fi

# User specific environment
if ! [[ "$PATH" =~ "$HOME/.local/bin:$HOME/bin:" ]]
then
    PATH="$HOME/.local/bin:$HOME/bin:$PATH"
fi
export PATH

# Uncomment the following line if you don't like systemctl's auto-paging feature:
# export SYSTEMD_PAGER=

# User specific aliases and functions.
# Files matching `host-*` are only sourced when the suffix matches the
# current hostname; that's how per-machine fragments stay co-located in
# the same dir without leaking onto the wrong host.
if [ -d ~/.bashrc.d ]; then
	for rc in ~/.bashrc.d/*; do
		[ -f "$rc" ] || continue
		case "$(basename "$rc")" in
			host-*)
				[[ "$(basename "$rc")" == "host-$HOSTNAME" ]] || continue
				;;
		esac
		. "$rc"
	done
	unset rc
fi

# Fedora EOL warning
_fedora_eol=$(. /etc/os-release && echo "${SUPPORT_END:-}")
if [[ -n "$_fedora_eol" ]]; then
    _today=$(date +%s)
    _eol_ts=$(date -d "$_fedora_eol" +%s)
    _days_left=$(( (_eol_ts - _today) / 86400 ))
    _fedora_ver=$(. /etc/os-release && echo "$VERSION_ID")
    if [[ $_days_left -le 0 ]]; then
        printf '\e[1;31m'
        printf '╔══════════════════════════════════════════════════════╗\n'
        printf '║                                                      ║\n'
        printf '║   ██████   ██████  ██                                ║\n'
        printf '║   ██       ██  ██  ██                                ║\n'
        printf '║   ████     ██  ██  ██                                ║\n'
        printf '║   ██       ██  ██  ██                                ║\n'
        printf '║   ██████   ██████  ██████                            ║\n'
        printf '║                                                      ║\n'
        printf '║   FEDORA %s IS END-OF-LIFE SINCE %s       ║\n' "$_fedora_ver" "$_fedora_eol"
        printf '║                                                      ║\n'
        printf '║   You are running UNPATCHED, UNSUPPORTED software.   ║\n'
        printf '║   No security fixes. No bug fixes. Nothing.          ║\n'
        printf '║                                                      ║\n'
        printf '║   UPGRADE NOW:                                       ║\n'
        printf '║     sudo dnf system-upgrade download --releasever=XX ║\n'
        printf '║     sudo dnf system-upgrade reboot                   ║\n'
        printf '║                                                      ║\n'
        printf '╚══════════════════════════════════════════════════════╝\n'
        printf '\e[0m'
    elif [[ $_days_left -le 14 ]]; then
        printf '\e[1;33mFedora %s EOL in %s days (%s) — start planning your upgrade.\e[0m\n' "$_fedora_ver" "$_days_left" "$_fedora_eol"
    fi
    unset _today _eol_ts _days_left _fedora_ver
fi
unset _fedora_eol

function fedora-eol {
    local eol ver today_ts eol_ts release_ts days_left total_days elapsed_days pct bar filled empty i
    eol=$(. /etc/os-release && echo "${SUPPORT_END:-}")
    ver=$(. /etc/os-release && echo "$VERSION_ID")
    if [[ -z "$eol" ]]; then
        echo "No SUPPORT_END in /etc/os-release"
        return 1
    fi
    today_ts=$(date +%s)
    eol_ts=$(date -d "$eol" +%s)
    # Fedora lifecycle is ~13 months from release to EOL
    release_ts=$(date -d "$eol - 13 months" +%s)
    days_left=$(( (eol_ts - today_ts) / 86400 ))
    total_days=$(( (eol_ts - release_ts) / 86400 ))
    elapsed_days=$(( total_days - days_left ))
    if [[ $elapsed_days -lt 0 ]]; then elapsed_days=0; fi
    if [[ $elapsed_days -gt $total_days ]]; then elapsed_days=$total_days; fi
    pct=$(( elapsed_days * 100 / total_days ))

    bar=""
    filled=$(( elapsed_days * 30 / total_days ))
    empty=$(( 30 - filled ))
    for (( i=0; i<filled; i++ )); do bar+="█"; done
    for (( i=0; i<empty; i++ )); do bar+="░"; done

    if [[ $days_left -le 0 ]]; then
        printf '\e[1;31m  Fedora %s: EOL since %s (%d days ago)\e[0m\n' "$ver" "$eol" "$(( -days_left ))"
        printf '\e[1;31m  [%s] 100%%\e[0m\n' "██████████████████████████████"
    elif [[ $days_left -le 14 ]]; then
        printf '\e[1;33m  Fedora %s: %d days until EOL (%s)\e[0m\n' "$ver" "$days_left" "$eol"
        printf '\e[1;33m  [%s] %d%%\e[0m\n' "$bar" "$pct"
    else
        printf '  Fedora %s: %d days until EOL (%s)\n' "$ver" "$days_left" "$eol"
        printf '  [%s] %d%%\n' "$bar" "$pct"
    fi
}

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
command -v nvm >/dev/null 2>&1 && nvm use "v22.22.2" > /dev/null 2>&1
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
[ -d /home/tay/build_tools/bin ]      && export PATH="/home/tay/build_tools/bin/:$PATH"
[ -d /home/tay/ttui/bin ]             && export PATH="/home/tay/ttui/bin:$PATH"
[ -d /home/tay/.config/emacs/bin ]    && export PATH="/home/tay/.config/emacs/bin:$PATH"
export PATH="/home/tay/.local/bin:$PATH"
[ -d /home/tay/.cargo/bin ]           && export PATH="/home/tay/.cargo/bin:$PATH"

alias gtime=/usr/bin/time


errcho(){ >&2 echo $@; }

#takes in port and gives process that is using it
function port2proc {
        PROC=$( fuser $@/tcp 2>/dev/null )
        if [ -z $PROC ]; then
            errcho "no process using port $1"
        else
            errcho "found process using port $i:"
            ps aux |grep -v grep | grep " $PROC "
        fi
}
function forceKillAndPrintProc {
    AUX=$( ps aux |grep -v grep | grep " $@ " )
    errcho "force killing process: $AUX"
    kill -9 $@
}

function port2pid {
    fuser $@/tcp 2>/dev/null
}

function portproc {
    for i in $@; do
        PROC=$( fuser $i/tcp 2>/dev/null )
        if [ -z $PROC ]; then
            errcho "no process using port $1"
        else
            errcho "found process using port $i:"
            ps aux |grep -v grep | grep " $PROC "
        fi
    done
}
export -f portproc

function nodeauxnonlsp {
    ps aux | grep node | grep -v "typescript-language-server" | grep -v "tsserver.js" | grep -v "eslint_d" | grep -v "typingsInstaller.js" | grep -v grep
}
export -f nodeauxnonlsp

function aux2pid {
    echo $1 | awk '{print $2}'
}
export -f aux2pid


[ -n "$EAT_SHELL_INTEGRATION_DIR" ] && \
  source "$EAT_SHELL_INTEGRATION_DIR/bash"


export NODE_OPTIONS='--max-old-space-size=10000'
command -v direnv >/dev/null 2>&1 && eval "$(direnv hook bash)"

# Nix: try multi-user (NixOS-style daemon) first, then single-user
if [ -e /run/current-system/profile/etc/profile.d/nix.sh ]; then
    . /run/current-system/profile/etc/profile.d/nix.sh
elif [ -e "$HOME/.nix-profile/etc/profile.d/nix.sh" ]; then
    . "$HOME/.nix-profile/etc/profile.d/nix.sh"
fi

export EDITOR='emacsclient -nw'

# opencode
[ -d /home/tay/.opencode/bin ] && export PATH="/home/tay/.opencode/bin:$PATH"

# Added by LM Studio CLI (lms)
[ -d /home/tay/.lmstudio/bin ] && export PATH="$PATH:/home/tay/.lmstudio/bin"
# End of LM Studio CLI section
