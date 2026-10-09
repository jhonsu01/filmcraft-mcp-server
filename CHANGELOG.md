# Changelog

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
