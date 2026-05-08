#!/usr/bin/env bash
# xset +fp /home/tay/.local/share/fonts/digital/bdf/
# xset +fp /home/tay/.local/share/fonts/unscii/
xset +fp ~/.guix-home/profile/share/fonts/misc
xset fp rehash
xrdb -m ~/.Xresources
#~/.screenlayout/g9.sh
~/.screenlayout/g9andcrt.sh
xsetroot -solid black
#autorandr --change
#systemctl --user start dunst

#setxkbmap -layout 'us(intl)' || true
#xmodmap ~/.Xmodmap || true
# kanata launch lives in kb_setup.sh now (host-aware: advantage360 on
# basedserv, advantage2 on work).
