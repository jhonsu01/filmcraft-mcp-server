# Changelog

## [1.1.4] - 2026-10-13
### Added
- DeepSeek Harness: the plugin folder in the Craft Bridges marketplace is also a Harness bundle (`cordis.patch.yml`
  inserting Harness's own MCP client, `@deepseek-ai/dsh-mcp-client`, over stdio with a 1-hour tool timeout).
  Install it with `github:jhonsu01/craft-marketplace#path:/plugins/filmcraft-mcp-server` in *Plugins → Add plugin*.
- Server instructions: when the app has a tool that delivers files (`present` in Harness), also call it with the
  output files, so they appear as cards that open in the app.
### Verified
- DeepSeek Harness 0.2.0-rc.2 on Windows 11: installed from GitHub, tools listed as `mcp__<server>__<tool>`, outputs
  shown as cards that open in Harness's viewer. Windows 11 and Debian 12 end-to-end checks pass.

## [1.1.3] - 2026-10-13
### Added
- Every result that names output files now carries `files_markdown`: ready-made links (percent-encoded `file:///`
  URLs) to each file and folder written, and the server instructions ask the assistant to show them as given. Paths
  with spaces, accents or parentheses no longer break the links, so agent apps (Codex, SunsamCode, Claude...) can
  open every output from the chat, also when a tool writes many files.
### Verified
- Windows 11 and Debian 12 (Docker): 22/22 end-to-end checks each (new: every `files_markdown` link is a valid
  `file:///` URL to an existing output); the `.mcpb` and the Codex plugin tested unpacked.

## [1.1.2] - 2026-10-10
### Added
- Codex (OpenAI) plugin: each release also ships `filmcraft-mcp-server-<version>-codex.zip` with
  `.codex-plugin/plugin.json` and `.mcp.json` (a local stdio server, `node ./dist/bundle.cjs`), built by
  `npm run pack:codex` from the same bundle and manifest as the `.mcpb`. The plugin is also listed in the
  [Craft Bridges](https://github.com/jhonsu01/craft-marketplace) Codex marketplace, which delivers updates.
- No changes to the tools.
### Verified
- Windows 11 and Debian 12 (Docker): all end-to-end checks pass; the `.mcpb` and the Codex plugin tested
  unpacked; the plugin installed from the marketplace with the Codex CLI and a tool call answered.

## [1.1.1] - 2026-10-09
### Fixed
- `edit_video` texts `position` is now declared as an array of 2 numbers instead of a JSON Schema tuple (`"items": [...]`). The Z.ai / GLM API (ZCode, Sunsam Code) rejected every request that included this tool with error `[1210] Invalid API parameter`, so no message could be sent while FilmCraft Bridge was enabled.

## [1.1.0] - 2026-10-07
### Added
- macOS and Linux support. The installation is found without setup on every OS: Windows (`Program Files`,
  `%LOCALAPPDATA%\Programs`), Linux deb/rpm (`/usr/bin`), tar.gz (`/opt/filmcraft/bin`, `~/.local/bin`, or
  `FILMCRAFT_DIR` pointing at the unpacked root), macOS (`/Applications/FilmCraft.app` plus the separate
  `filmcraft-cli` zip in `/usr/local/bin`, `/opt/homebrew/bin`, `~/bin`...), and `PATH` everywhere.
- `FILMCRAFT_CLI` and `FILMCRAFT_APP` settings (CLI in a custom place, AppImage desktop app); the extension
  settings now also offer the `filmcraft-cli` path.
- `get_filmcraft_status` reports the platform; running-app detection uses `pgrep` on macOS / Linux.
- README in 9 languages: English, Español, Português, Français, Deutsch, Русский, 简体中文, 日本語, 한국어.
### Changed
- Native path handling per OS (case-sensitive file comparison on Linux, POSIX paths passed to the engine unchanged).
### Verified
- Windows 11 and Debian 12 (Docker, headless, FilmCraft 0.2.1 tar.gz): 21/21 end-to-end checks each.
  macOS is supported by the same code paths but not yet tested on a Mac.

## [1.0.0] - 2026-10-07
### Added
- MCP server on FilmCraft's own headless engine (`filmcraft-cli mcp`), one private engine per job,
  commands sent one at a time so the ids each one returns can feed the next.
- 11 tools: `split_video` (frame-accurate N-second pieces, one folder per input), `edit_video`
  (130 video effects with params and keyframes, 18 Lumetri looks, burned-in titles with placement / colour /
  outline / background / animation, speed, reverse, 58 audio effects, volume, fades), `trim_video`,
  `concat_videos` (112 transitions), `convert_media` (H.264, ProRes, DNxHR, MJPEG, MXF, GIF, stills,
  WAV/AIFF, 28 presets), `get_media_info`, `render_frame`, `list_catalog`, `run_commands`
  (any of 666 engine commands, `$items` / `$steps[N]` references, headless or live), `open_in_filmcraft`,
  `get_filmcraft_status`.
- Editable outputs on split / edit / trim / join: `.fcproj`, OpenTimelineIO, FCPXML, Premiere XML, EDL, AAF.
- 21 end-to-end checks over real MCP stdio using FilmCraft's synthetic demo footage.
