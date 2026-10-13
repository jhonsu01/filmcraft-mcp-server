<p align="center"><img src="icon.png" width="120" alt="FilmCraft Bridge icon"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <b>English</b> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Let Claude edit video with the <b>FilmCraft</b> installed on your computer — <b>Windows, macOS and Linux</b>:<br>
  split, trim, effects, color looks, titles, speed, audio, transitions, export, and editable timelines.
</p>

---

## Why

[FilmCraft](https://github.com/storytold/filmcraft) is an open-source, Premiere-class video editor written in Rust. Every action in it is an engine command, and it ships a headless CLI (`filmcraft-cli`). This [Model Context Protocol](https://modelcontextprotocol.io) server turns that engine into **file-in / file-out tools** for Claude, so you can ask things like:

> *"Split every video in `D:\clips` into 2-second pieces, one folder per video."*
> *"Add a vignette, the Golden Dusk look and the title 'Day 1' at the bottom of `~/trip/a.mp4`."*
> *"Join these three shots with a cross dissolve and export them for YouTube 1080p."*
> *"Give me the edit as a FilmCraft project and as FCPXML for DaVinci."*

Inspired by [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Platforms

| OS | FilmCraft package to install | Where the server finds it (no setup needed) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86) | MSI or portable zip | `C:\Program Files\FilmCraft`, `%LOCALAPPDATA%\Programs\FilmCraft`, `PATH` | ✅ Verified (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` or `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/filmcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verified (Debian 12, headless, 21/21 e2e) |
| **macOS** 11+ (Apple silicon and Intel) | `.dmg` (the app) **plus** `filmcraft-cli-<version>-macos-universal.zip` | `/Applications/FilmCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Supported, not yet tested on a Mac |

All downloads: [FilmCraft releases](https://github.com/storytold/filmcraft/releases). Anywhere else: set `FILMCRAFT_DIR` (folder, `.tar.gz` root or `FilmCraft.app`) or `FILMCRAFT_CLI`.

- **macOS:** the DMG contains only the app. Unzip the separate `filmcraft-cli` zip and move `filmcraft-cli` to `/usr/local/bin` (or point `FILMCRAFT_CLI` at it). If macOS blocks its first run, allow it in *System Settings → Privacy & Security*.
- **Linux:** the AppImage and Flatpak contain only the app, not `filmcraft-cli`; use the deb, rpm or tar.gz. For an AppImage app, set `FILMCRAFT_APP` so `open_in_filmcraft` can start it. On a server without a GPU, the verified setup used `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2`.

## How it works

| Part | What it is |
| --- | --- |
| **FilmCraft engine** (`filmcraft-cli mcp`) | FilmCraft's own headless engine: its H.264/HEVC/ProRes/AAC codecs, compositor, effects, Lumetri, text engine and exporters. Started fresh for each job in a private temp folder. |
| **MCP server** (Node.js) | 11 high-level tools. Talks to the engine one command at a time (ids returned by one command feed the next), validates paths, never overwrites. |
| **Live app** (optional) | `open_in_filmcraft` / `run_commands live=true` drive the FilmCraft desktop app through its control channel (`filmcraft --control 9876`). |

## Tools

| Tool | What it does |
| --- | --- |
| `split_video` | Cut one or many files into N-second pieces, frame-accurate, one folder per input (`<name>_001.mp4`…) |
| `edit_video` | Video effects (with params and keyframes), Lumetri look, burned-in titles, speed / reverse, audio effects, volume, fades — on one or many files |
| `trim_video` | Keep a time range, with optional fades |
| `concat_videos` | Join videos, stills and audio with any of 112 transitions |
| `convert_media` | Re-export: codec, size, frame rate, bitrate, loudness, preset; extract audio |
| `get_media_info` | Container, duration, codecs, frame size, frame rate, audio |
| `render_frame` | One frame of a file or `.fcproj` as PNG (shown to Claude) |
| `list_catalog` | Video/audio effects, transitions, Lumetri looks, export presets, engine commands |
| `run_commands` | Any of the 666 engine commands, with `$items[0]` / `$steps[N].path` references |
| `open_in_filmcraft` | Open projects or media in the FilmCraft app |
| `get_filmcraft_status` | Platform, install, version, app / control port, catalog sizes |

## What you get

| | |
| --- | --- |
| **Input** | MP4, MOV, MKV, WebM, AVI, MXF, MPEG-TS, GIF · WAV, MP3, FLAC, AIFF, Ogg, Opus, M4A · PNG, JPEG, TIFF, BMP, WebP, EXR, DPX… |
| **Export (render)** | H.264 `.mp4` · ProRes / DNxHR / MJPEG `.mov` · MXF OP1a / OP-Atom · animated GIF · PNG / TIFF / BMP stills · WAV / AIFF |
| **Export presets** | 28: Match Source (3 bitrates), YouTube / Vimeo 1080p & 4K, Social Vertical 1080×1920, ProRes 422 family, DNxHR, MXF, image sequences, GIF, WAV… |
| **Editable outputs** | `.fcproj` (FilmCraft project) · OpenTimelineIO `.otio` · FCPXML (Final Cut / DaVinci) · Premiere / FCP7 `.xml` · `.edl` · AAF (Avid / Pro Tools) |
| **Video effects** | 130: blur family, sharpen, black & white, levels, ProcAmp, tint, Lumetri, mosaic, posterize, noise, glow, RGB split, lens flare, light leaks, camera shake, mirror, twirl, wave warp, crop, flips, drop shadow, grow / shrink / move / spin / wiggle animations… |
| **Color looks** | 18 Lumetri presets: Teal Shadows Warm Skin, Night Exterior, Golden Dusk, Steel Blue, Hard Sun, Faded Print, Silver Retention, Cross Processed, Warm Negative, Neutral / Hard / Cold Mono, Sepia… |
| **Audio effects** | 58: EQ, filters, dynamics, limiter, DeNoise, DeHummer, De-esser, reverb, delay, pitch shift, speech enhance… |
| **Transitions** | 112 video (dissolves, dips, push, slide, whip, zoom blur, glitch, iris, wipes…) + 3 audio crossfades |

## Example

```json
{
  "input_path": "/home/me/clips/beach.mp4",
  "effects": [
    { "effect": "vignette", "params": { "amount": -60 } },
    { "effect": "motion", "keyframes": { "scale": [ { "seconds": 0, "value": 100 }, { "seconds": 3, "value": 115 } ] } }
  ],
  "color_preset": "Golden Dusk",
  "texts": [ { "text": "Day 1", "placement": "bottom", "color": "#ffcc00", "stroke_color": "#000000", "size": 110 } ],
  "fade_in": 0.5,
  "preset": "Social Vertical 1080×1920",
  "save_project": true,
  "interchange": ["fcpxml"]
}
```

## Requirements

- **FilmCraft** with `filmcraft-cli` (tested with **0.2.1**) — see [Platforms](#platforms)
- Node.js ≥ 20 (bundled with Claude Desktop for `.mcpb` installs)

## Installation

### Claude Desktop (recommended, all platforms)

1. Download `filmcraft-mcp-server.mcpb` from the [latest release](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. Double-click it (or drag it onto Claude Desktop → *Settings → Extensions*) and click **Install**.
3. Optional: if FilmCraft is not in a standard place, set its folder or the `filmcraft-cli` path in the extension settings.

### Codex (OpenAI)

**Recommended — the marketplace (gets updates):** *Plugins → Add → Add marketplace*, source `jhonsu01/craft-marketplace`, reference `main`, then install **FilmCraft Bridge** from **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). New versions arrive by refreshing the marketplace. Or upload the zip (Codex then keeps it in your account and refuses a newer zip with the same name):

1. Download `filmcraft-mcp-server-<version>-codex.zip` from the [latest release](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. In Codex: *Plugins → Add → New plugin*, choose the zip and click **Add plugin**.
3. Codex starts the server with `node`, so Node.js ≥ 20 must be on `PATH`. If FilmCraft is not in a standard location, set `FILMCRAFT_DIR` or `FILMCRAFT_CLI` as system environment variables (Codex has no settings form for local plugins).

### DeepSeek Harness

1. *Plugins → Add plugin*, enter `github:jhonsu01/craft-marketplace#path:/plugins/filmcraft-mcp-server` and click **Install**, then **Enable now**.
2. Harness runs the server with its own MCP client and `node` (Node.js ≥ 20 on `PATH`); the tools appear as `mcp__filmcraft__<tool>` and the output files as cards that open in Harness.
3. Harness does not update plugins by itself yet: to upgrade, uninstall the plugin and install it again with the same address.

### Claude Code / other MCP clients

```bash
git clone https://github.com/jhonsu01/filmcraft-mcp-server.git
cd filmcraft-mcp-server
npm install
npm run build
```

Windows:

```bash
claude mcp add filmcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux:

```bash
claude mcp add filmcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuration

| Variable | Meaning |
| --- | --- |
| `FILMCRAFT_DIR` | FilmCraft install folder, one of its executables, a `.tar.gz` root (with `bin/`) or `FilmCraft.app`. Default: auto-detect (see [Platforms](#platforms)) |
| `FILMCRAFT_CLI` | Path of `filmcraft-cli` / `filmcraft-cli.exe` (wins over `FILMCRAFT_DIR`) |
| `FILMCRAFT_APP` | Path of the desktop app when it lives elsewhere (e.g. a Linux AppImage) |
| `FILMCRAFT_DATA_DIR` | FilmCraft data folder, for your own export presets |
| `FILMCRAFT_CONTROL_PORT` | Control port of the desktop app (default 9876) |
| `FILMCRAFT_MCP_TIMEOUT` | Max seconds per engine command (default 3600) |

## Safety

- Files are **never overwritten** unless `overwrite: true`; the input is never modified.
- All paths must be absolute.
- Everything runs locally with no network access. Each job uses a private engine in a temp folder that is removed afterwards.

## Development

```bash
npm run build       # TypeScript + single-file bundle (dist/bundle.cjs)
npm test            # unit tests (Windows, macOS and Linux path logic)
npm run test:e2e    # 22 end-to-end checks over real MCP stdio (FilmCraft's synthetic demo footage)
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
npm run pack:codex  # Codex plugin zip
```

Linux check in Docker (unpack `filmcraft-<version>-linux-x86_64.tar.gz` first):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/filmcraft-0.2.1-linux-x86_64:/opt/filmcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 && node scripts/e2e.mjs"
```

## License

Apache-2.0. FilmCraft is © its authors (Storytold), dual-licensed MIT / Apache-2.0.
This project is not affiliated with or endorsed by FilmCraft or Storytold. Adobe Premiere Pro is a trademark of Adobe.
