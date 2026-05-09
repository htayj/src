---
name: ggn-upload
description: Use when preparing, reviewing, or troubleshooting GazelleGames (GGn) torrent uploads: duplicate checks, group vs release fields, game/OST/e-book metadata, images/screenshots, tags, release types, .torrent piece size, post-upload seeding, or GGn wiki/API lookups.
---
# GGn Uploads

Use the GGn MCP/API and the site wiki as the source of truth. Do not guess rules: if the user asks for a real upload, verify the current wiki/rules pages first.

## Safety and account rules

- Never expose or persist `GGN_API_KEY`, passkeys, announce URLs, torrent files, NFOs containing secrets, serials, invite data, or private user/account details.
- Keep uploads legal for the user's context and consistent with GGn's current upload rules.
- If uncertain about category, release type, scene/P2P status, platform, image acceptability, or rules, tell the user to ask `#GGn-Help`, Staff PM, or the Uploading Questions forum before submitting.
- For descriptions: censor serial keys in README/NFO-derived text; do not put serials in descriptions.

## Required first pass

1. Read/refresh relevant GGn wiki pages with the MCP before giving final upload instructions:
   - Wiki index: `ggn_ggn_api_request(endpointName="wiki", params={"id":1})`
   - Uploading Guide: wiki id `245`
   - Perfect Game Groups: wiki id `608` for game groups
   - Perfect OST Groups: wiki id `660` for OSTs
   - Perfect E-Book Groups: wiki id `681` for e-books/guides/comics/magazines
   - Release Description Templates: wiki id `573`
   - Tags: wiki id `638`
   - Rip Source / Release Type combinations: wiki id `255`
   - Image host/image guidelines: wiki ids `214` and `34`
   - Torrent Piece Size: wiki id `300`
2. Have the user identify the upload type: Game, Application, E-Book/Guide, or OST.
3. Ask for the local content facts needed for that type: exact title, platform, files/folders, source, release title, language(s), region, edition, descriptions, images, screenshots, trailer, links, and whether it is scene/P2P/home rip/verified dump/DRM-free/etc.
4. Do a duplicate/empty-group check before creating instructions:
   - Use GGn search MCP for active torrents and likely existing groups.
   - Search broad title keywords, exact title, aliases, platform, and if needed file-list terms.
   - If a group exists, prefer **Add Torrent** from the existing group. If an empty group exists, reuse it.

## Upload workflow checklist

- Review current GGn upload rules and the upload form's **Do not upload** list.
- Check files against rules before creating the `.torrent`; the uploader is responsible for content they upload.
- Create a private torrent using the user's GGn announce URL. Choose a piece size near `content size / 1024` and keep the `.torrent` under the site cap; see reference table.
- If uploading into an existing group, use **Add Torrent** so group metadata stays linked.
- If making a new platform group, use **Upload new platform** from the related game group and fix platform-specific fields.
- If creating an empty group first, use **Upload later**, then add the torrent later from that group.
- Separate **group information** from **release information**:
  - Group info describes the game/book/OST/application generally.
  - Release info describes this specific torrent: files, source, edition, language, format, install/rip notes, NFO/logs, bonus material, etc.
- Prefer leaving Anonymous unchecked for new uploaders so users/staff can give feedback.
- Double-check every field before submission.
- After upload, download the site-generated `.torrent` if prompted because GGn adds the `source=GGn` flag; seed from that torrent and point it at the existing files.
- If the client shows Unregistered, wait a few minutes, update tracker/restart torrent; if still broken, redownload the site torrent and ensure the torrent was private.

## Quality standards summary

- Titles: exact, full, correctly capitalized/punctuated; use reputable sources. Special editions generally keep the base group title and put edition info in release fields.
- Tags: at least two; choose genre/content tags, not region/language/release-specific tags. Adult/NSFW content must include `adult`.
- Images: no hotlinking; use whitelisted hosts. PTPImg is preferred; Postimages/PostImage is allowed. Avoid imgur/tinypic/imageshack/photobucket.
- Screenshots: minimum four for games; prefer 8/12/16/20 if available. At least three must show gameplay. No watermarks except official ones.
- Cover art: use the front cover only, no animated GIFs, no alpha/transparent areas; for games prefer vertical covers around 900px+ high, OST covers are usually square, e-book covers should be cropped to cover only and ideally 1000px+ tall.
- Trailers: prefer official gameplay trailers matching the platform; if unavailable, use clean gameplay footage without commentary/watermarks/logos.
- PC/application descriptions must include minimum system requirements in quote-style BBCode.

For detailed field-by-field guidance and templates, see `references/ggn-upload-wiki-summary.md`.
