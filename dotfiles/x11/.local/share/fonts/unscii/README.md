# Vendored Unscii core-X font

This directory vendors the upstream Unscii 16 full PCF bitmap font for programs
that use legacy X core fonts instead of fontconfig/Xft. StumpWM's built-in
`set-font` path is one of those programs.

- Source: <http://viznut.fi/unscii/unscii-16-full.pcf>
- Upstream page: <http://viznut.fi/unscii/>
- Variant: `unscii-16-full`
- SHA256: `60b59c3794abe4d2f8ad0c0b92a11179a9fe18474560bd862113744f80d1270a`

The upstream page notes that `unscii-16-full` falls under GPL because it
incorporates glyphs from GNU Unifont. Regenerate `fonts.dir` with:

```sh
mkfontdir ~/.local/share/fonts/unscii
```
