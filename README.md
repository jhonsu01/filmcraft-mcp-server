<p align="center"><img src="icon.png" width="120" alt="FilmCraft Bridge icon"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <b>English</b> · <a href="README.es.md">Español</a>
</p>

<p align="center">
  Let Claude edit video with the <b>FilmCraft</b> installed on your Windows PC —<br>
  split, trim, effects, color looks, titles, speed, audio, transitions, export, and editable timelines.
</p>

---

## Why

[FilmCraft](https://github.com/storytold/filmcraft) is an open-source, Premiere-class video editor written in Rust. Every action in it is an engine command, and it ships a headless CLI (`filmcraft-cli`). This [Model Context Protocol](https://modelcontextprotocol.io) server turns that engine into **file-in / file-out tools** for Claude, so you can ask things like:

> *"Split every video in `D:\clips` into 2-second pieces, one folder per video."*
> *"Add a vignette, the Golden Dusk look and the title 'Day 1' at the bottom of `D:\trip\a.mp4`."*
> *"Join these three shots with a cross dissolve and export them for YouTube 1080p."*
> *"Give me the edit as a FilmCraft project and as FCPXML for DaVinci."*

Inspired by [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

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
| `get_filmcraft_status` | Install, version, app / control port, catalog sizes |

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
  "input_path": "D:\\clips\\beach.mp4",
  "effects": [
    { "effect": "vignette", "params": { "amount": -60 } },
    { "effect": "motion", "keyframes": { "scale": [ { "seconds": 0, "value": 100 }, { "seconds": 3, "value": 115 } ] } }
  ],
  "color_preset": "Golden Dusk",
  "texts": [ { "text": "Día 1", "placement": "bottom", "color": "#ffcc00", "stroke_color": "#000000", "size": 110 } ],
  "fade_in": 0.5,
  "preset": "Social Vertical 1080×1920",
  "save_project": true,
  "interchange": ["fcpxml"]
}
```

## Requirements

- Windows 10/11 x64
- **FilmCraft** (tested with **0.2.1**), with `filmcraft-cli.exe` in its install folder
- Node.js ≥ 20 (bundled with Claude Desktop for `.mcpb` installs)

## Installation

### Claude Desktop (recommended)

1. Download `filmcraft-mcp-server.mcpb` from the [latest release](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. Double-click it (or drag it onto Claude Desktop → *Settings → Extensions*) and click **Install**.
3. Optional: if FilmCraft is not in `C:\Program Files\FilmCraft`, set its folder in the extension settings.

### Claude Code / other MCP clients

```bash
git clone https://github.com/jhonsu01/filmcraft-mcp-server.git
cd filmcraft-mcp-server
npm install
npm run build
claude mcp add filmcraft -- node "%CD%\dist\bundle.cjs"
```

## Configuration

| Variable | Meaning |
| --- | --- |
| `FILMCRAFT_DIR` | FilmCraft install folder (or one of its `.exe`). Default: `C:\Program Files\FilmCraft` |
| `FILMCRAFT_CLI` | Path of `filmcraft-cli.exe` (overrides `FILMCRAFT_DIR`) |
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
npm test            # unit tests
npm run test:e2e    # 21 end-to-end checks over real MCP stdio (FilmCraft's synthetic demo footage)
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
```

## License

Apache-2.0. FilmCraft is © its authors (Storytold), dual-licensed MIT / Apache-2.0.
This project is not affiliated with or endorsed by FilmCraft or Storytold. Adobe Premiere Pro is a trademark of Adobe.
