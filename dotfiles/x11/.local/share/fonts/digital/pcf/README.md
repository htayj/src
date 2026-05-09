# Vendored DEC/DIGITAL core-X fonts

This directory vendors the DEC VT220/DIGITAL bitmap fonts from
<https://github.com/htayj/DEC-Fonts> for programs that use legacy X core
fonts instead of fontconfig/Xft.

- Source repo: <https://github.com/htayj/DEC-Fonts>
- Source commit: `a74790ac45f0da866d6ab9f8869fe5b6873dfeb1`
- Source files: `dist/fonts/bdf/*.bdf`
- Vendored format: gzipped PCF generated with `bdftopcf | gzip -9n`

Regenerate after updating the source checkout with:

```sh
for bdf in DEC-Fonts/dist/fonts/bdf/*.bdf; do
  base=$(basename "$bdf" .bdf)
  bdftopcf "$bdf" | gzip -9n > "$base.pcf.gz"
done
mkfontdir .
```
