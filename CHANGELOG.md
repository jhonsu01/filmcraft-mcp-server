# Changelog

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
