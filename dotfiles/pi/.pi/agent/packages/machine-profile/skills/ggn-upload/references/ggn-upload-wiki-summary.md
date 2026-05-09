# GGn upload wiki summary

Source: GGn MCP wiki reads on 2026-05-09. Re-check live wiki pages before real uploads.

## Important wiki IDs

- `1` — Wiki index
- `245` — Uploading Guide
- `608` — Perfect Game Groups (Pages)
- `660` — Perfect OST Groups (Pages)
- `681` — Perfect E-Book Groups (Pages)
- `573` — Release Description Templates
- `638` — Tagging Guidelines
- `255` — Rip Source & Release Type Combinations
- `214` — Image Host Whitelist
- `34` — Image Link Guidelines
- `300` — Torrent Piece Size
- Also relevant from index: Uploading Rules `/rules.php?p=upload`, Age Ratings `79/321`, Verified Dump Requirements `579`, Hypervisor Bypass Requirements `680`, Capitalization Guidelines `31`.

## Duplicate/group decision

1. Search active torrents and empty groups before upload.
2. Search broad keywords, exact title, aliases, platform, and for hard spellings search file-list terms.
3. If an existing group exists, use **Add Torrent**.
4. If an empty group exists, reuse it; the group metadata is already present.
5. Create a new game group only when the game is absent or the game exists only for another platform.
6. Create a new OST/e-book group only when that OST/e-book group is absent.
7. Use **Upload later** to create an empty group before the actual torrent if metadata is ready but files/torrent are not.

## Game group fields

- Platform: choose carefully; ask help if the exact platform is unclear.
- Game title: exact full title, punctuation, capitalization; copy from a reputable source.
- Aliases: alternate regional/original/romaji names; separate with `||` or commas.
- Tags: at least two. Use game genres/content/perspective; do not use region/language/release-specific tags. Adult content requires `adult`.
- Year: first release year on that platform, not edition/re-release year.
- Age rating: prefer PEGI; if not available, use ESRB/CERO/other via comparison guidance; do not guess except mandatory 18+ for adult games.
- Critic ratings: official review scores for the same platform. Windows/Linux/Mac reviews are generally compatible with each other; console reviews are not cross-platform.
- Web links: add official/Wikipedia/GameFAQs/MobyGames/etc. as fields, not in descriptions.
- Cover: front cover only, no watermarks, no hotlinking; PTPImg preferred. Game covers generally vertical and 900px+ high.
- Trailer: official and platform-appropriate; gameplay preferred over teaser/story if multiple choices.
- Description: about the game, not the specific release. Suggested structure:

```bbcode
[align=center][b][u]About the game[/u][/b][/align]
General game description.

[align=center][b][u]Key Features[/u][/b][/align]
[*]Feature one
[*]Feature two

[quote][align=center][b][u]System Requirements[/u][/b][/align]

[b]Minimum[/b]
[*][b]OS[/b]: ...
[*][b]Processor[/b]: ...[/quote]
```

Console games generally do not need system requirements. PC/non-console games should include them.

## Game release fields

- Special Edition: check for Collector's, GOTY, Digital Deluxe, GOG/Humble, etc.; enter edition year and short title such as `Collector's Edition`, not the full game title again.
- Rip Source:
  - `Scene` only when there is an NFO from a scene group and original files are unmodified.
  - `Other` for P2P, home rip, modified scene packaging, self-ripped, etc.
- Release Title:
  - Scene: exact full scene release title.
  - Other: P2P release name or game title as appropriate.
- Release Type combinations:
  - Scene: Full ISO, GameDOX, Rip, Scrubbed, DRM Free, ROM, Other.
  - Other: Full ISO, GameDOX, P2P, Scrubbed, Home Rip, DRM Free, ROM, Other.
- Release Type meanings:
  - Full ISO: untouched 1:1 disc/game files, often `.iso`; includes verified disc dumps and scene ISO releases.
  - GameDOX: add-ons such as keygens, patches, DLC, trainers, manuals/artwork; not a prepatched full game.
  - GGn Internal: restricted; do not select unless specifically authorized.
  - P2P: only for recognized P2P groups.
  - Rip: scene-only, content removed/ripped.
  - Scrubbed: padding/garbage removed; if game data removed, use Home Rip.
  - Home Rip: uploader/non-scene/non-P2P rip or copy where game data changed/files removed/files added.
  - DRM Free: originally DRM-free store distribution (e.g. GOG/Humble) uploaded as distributed, not repacked. Do not use for Steam just because it has no DRM.
  - ROM: cartridge/arcade ROM image.
  - Other: avoid unless nothing fits; ask for help.
- Language: if multi-language, list languages in release description. Undubs are Multi-Language.
- Release Description: release-specific notes, install notes, languages, home-rip details, NFO/log. Include NFO for scene releases. Censor serial keys.

## Applications, guides, e-books

- Title: exact full title with correct capitalization/punctuation.
- Tags: manually entered; adult/nudity requires `adult`.
- Cover: no hotlinking; use whitelisted image host.
- Description: general subject/application/book description. For applications include minimum system requirements.
- Release Description: information specific to this torrent, e.g. missing foreword, install notes, authors for multi-author works.
- E-book group title format: `Title by Author`; for multiple authors use site guidance such as `Various Authors` and list authors in release description.
- Magazine release titles: individual issue `Magazine Name (month yyyy)`, annual bundle `Magazine Name (yyyy)`, complete bundle `Magazine Name (Complete)`.
- E-book release description template:

```bbcode
[align=center][quote]Authors: [b]ABC and XYZ[/b] | Published: [b]dd mmm yyyy[/b] | Pages: [b]##[/b][/quote][/align]
```

## OST groups

- Do not upload freely available fan/OCRemix-style albums unless current rules allow it.
- Search duplicate OST groups and related game groups first.
- Title format: `Title by Artist`; avoid gratuitous `OST/Original Soundtrack` unless official title contains it.
- Artist on cover takes precedence when credited there; use `Various Artists` when tracks have many credited artists.
- Description should include metadata, tracklist, total length, and notes.
- Tags: music genre/sub-genre/style/instruments/language where relevant; not related game's genre tags. At least two.
- Cover: usually square; 1200x1200 ideal, 2000x2000+ excessive; no animated GIFs/alpha; PTPImg preferred.
- Weblinks: Discogs `/master/` and MusicBrainz `/release-group/` preferred when available; remove iTunes language code except region-only albums; do not put weblinks in group description.
- Release info: format, bitrate, bonus tracks/remixes/covers/sheet music, and rip logs if self-ripped.

## Image rules

- No hotlinking: do not link directly from Google Images, Wikipedia, blogs, stores, etc.
- Torrent uploads may use only whitelisted image hosts.
- Whitelist from wiki: `ptpimg.me` (preferred) and PostImage/Postimages.
- Blacklist: tinypic, imageshack, imgur, photobucket.
- Covers: front cover only; avoid very large non-screenshot images.
- Screenshots: no watermarks, no animated GIFs; for games most/at least three must be gameplay.

## Piece size recommendations

Aim for roughly `content size / 1024`; GGn has about a 1 MB `.torrent` file size cap.

| Content size | Piece size |
| --- | --- |
| <64 MB | 32 kB |
| 64–128 MB | 64 kB |
| 128–256 MB | 128 kB |
| 256–512 MB | 256 kB |
| 512 MB–1 GB | 512 kB |
| 1–2 GB | 1 MB |
| 2–4 GB | 2 MB |
| 4–8 GB | 4 MB |
| 8–16 GB | 8 MB |
| 16–32 GB | 16 MB |
| 32–64 GB | 32 MB |
| >64 GB | 64 MB |

One step up/down is usually acceptable; do not use tiny pieces for huge torrents or huge pieces for tiny ROMs.

## Post-upload

- GGn adds `source=GGn`, changing the torrent hash. If warned, download the site-generated torrent and seed from it.
- Point the torrent to the existing local files.
- If client shows Unregistered, wait a few minutes and update tracker/restart. If it persists, remove the torrent from client (not files), redownload the site torrent, and seed from that.
- If metadata is wrong, edit allowed torrent/group fields. Ask staff for renames/merges or fields you cannot edit; do not delete/reupload just to fix metadata.
