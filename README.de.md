<p align="center"><img src="icon.png" width="120" alt="FilmCraft-Bridge-Symbol"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <b>Deutsch</b> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Lass Claude Videos mit dem auf deinem Rechner installierten <b>FilmCraft</b> bearbeiten — <b>Windows, macOS und Linux</b>:<br>
  Teilen, Schneiden, Effekte, Farblooks, Titel, Geschwindigkeit, Audio, Übergänge, Export und bearbeitbare Timelines.
</p>

---

## Warum

[FilmCraft](https://github.com/storytold/filmcraft) ist ein quelloffener Videoeditor auf Premiere-Niveau, geschrieben in Rust. Jede Aktion ist ein Engine-Befehl, und er bringt eine CLI ohne Oberfläche mit (`filmcraft-cli`). Dieser [Model Context Protocol](https://modelcontextprotocol.io)-Server macht aus dieser Engine **Datei-zu-Datei-Werkzeuge** für Claude, sodass du zum Beispiel fragen kannst:

> *„Teile jedes Video in `D:\clips` in 2-Sekunden-Stücke, ein Ordner pro Video.“*
> *„Füge `~/reise/a.mp4` eine Vignette, den Look Golden Dusk und unten den Titel ‚Tag 1‘ hinzu.“*
> *„Verbinde diese drei Einstellungen mit einer Kreuzblende und exportiere sie für YouTube 1080p.“*
> *„Gib mir den Schnitt als FilmCraft-Projekt und als FCPXML für DaVinci.“*

Inspiriert von [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plattformen

| System | Zu installierendes FilmCraft-Paket | Wo der Server es findet (ohne Einrichtung) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86) | MSI oder portables Zip | `C:\Program Files\FilmCraft`, `%LOCALAPPDATA%\Programs\FilmCraft`, `PATH` | ✅ Geprüft (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` oder `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/filmcraft/bin`, `~/.local/bin`, `PATH` | ✅ Geprüft (Debian 12, ohne Oberfläche, 21/21 E2E) |
| **macOS** 11+ (Apple Silicon und Intel) | `.dmg` (die App) **plus** `filmcraft-cli-<version>-macos-universal.zip` | `/Applications/FilmCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Unterstützt, noch nicht auf einem Mac getestet |

Downloads: [FilmCraft-Releases](https://github.com/storytold/filmcraft/releases). An anderen Orten: `FILMCRAFT_DIR` (Ordner, Wurzel des `.tar.gz` oder `FilmCraft.app`) oder `FILMCRAFT_CLI` setzen.

- **macOS:** Das DMG enthält nur die App. Entpacke das separate `filmcraft-cli`-Zip und verschiebe `filmcraft-cli` nach `/usr/local/bin` (oder setze `FILMCRAFT_CLI` darauf). Blockiert macOS den ersten Start, erlaube ihn unter *Systemeinstellungen → Datenschutz & Sicherheit*.
- **Linux:** AppImage und Flatpak enthalten nur die App, kein `filmcraft-cli`; nutze deb, rpm oder tar.gz. Ist die App ein AppImage, setze `FILMCRAFT_APP`, damit `open_in_filmcraft` sie starten kann. Auf einem Server ohne GPU nutzte die geprüfte Umgebung `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2`.

## Funktionsweise

| Teil | Was es ist |
| --- | --- |
| **FilmCraft-Engine** (`filmcraft-cli mcp`) | FilmCrafts eigene Engine ohne Oberfläche: ihre H.264/HEVC/ProRes/AAC-Codecs, Compositor, Effekte, Lumetri, Text-Engine und Exporter. Für jeden Auftrag frisch gestartet, in einem privaten temporären Ordner. |
| **MCP-Server** (Node.js) | 11 Werkzeuge auf hoher Ebene. Sendet der Engine einen Befehl nach dem anderen (die von einem Befehl gelieferten IDs speisen den nächsten), prüft Pfade und überschreibt nie etwas. |
| **Live-App** (optional) | `open_in_filmcraft` / `run_commands live=true` steuern die Desktop-App über ihren Steuerkanal (`filmcraft --control 9876`). |

## Werkzeuge

| Werkzeug | Funktion |
| --- | --- |
| `split_video` | Teilt eine oder viele Dateien bildgenau in N-Sekunden-Stücke, ein Ordner pro Datei (`<name>_001.mp4`…) |
| `edit_video` | Videoeffekte (mit Parametern und Keyframes), Lumetri-Look, eingebrannte Titel, Geschwindigkeit / rückwärts, Audioeffekte, Lautstärke, Blenden; für eine oder viele Dateien |
| `trim_video` | Behält einen Zeitbereich, optional mit Blenden |
| `concat_videos` | Verbindet Videos, Standbilder und Audio mit einem von 112 Übergängen |
| `convert_media` | Neu exportieren: Codec, Größe, Bildrate, Bitrate, Lautheit, Preset; Audio extrahieren |
| `get_media_info` | Container, Dauer, Codecs, Bildgröße, Bildrate, Audio |
| `render_frame` | Ein Bild einer Datei oder eines `.fcproj` als PNG (Claude sieht es) |
| `list_catalog` | Video-/Audioeffekte, Übergänge, Lumetri-Looks, Export-Presets, Engine-Befehle |
| `run_commands` | Jeder der 666 Engine-Befehle, mit Verweisen `$items[0]` / `$steps[N].pfad` |
| `open_in_filmcraft` | Öffnet Projekte oder Medien in der FilmCraft-App |
| `get_filmcraft_status` | Plattform, Installation, Version, App / Steuerport, Katalogumfang |

## Was du bekommst

| | |
| --- | --- |
| **Eingabe** | MP4, MOV, MKV, WebM, AVI, MXF, MPEG-TS, GIF · WAV, MP3, FLAC, AIFF, Ogg, Opus, M4A · PNG, JPEG, TIFF, BMP, WebP, EXR, DPX… |
| **Export (Rendern)** | H.264 `.mp4` · ProRes / DNxHR / MJPEG `.mov` · MXF OP1a / OP-Atom · animiertes GIF · PNG- / TIFF- / BMP-Einzelbilder · WAV / AIFF |
| **Export-Presets** | 28: Match Source (3 Bitraten), YouTube / Vimeo 1080p und 4K, Social Vertical 1080×1920, ProRes-422-Familie, DNxHR, MXF, Bildsequenzen, GIF, WAV… |
| **Bearbeitbare Ausgaben** | `.fcproj` (FilmCraft-Projekt) · OpenTimelineIO `.otio` · FCPXML (Final Cut / DaVinci) · Premiere- / FCP7-`.xml` · `.edl` · AAF (Avid / Pro Tools) |
| **Videoeffekte** | 130: Weichzeichner, Schärfen, Schwarzweiß, Tonwerte, ProcAmp, Färbung, Lumetri, Mosaik, Posterisieren, Rauschen, Glühen, RGB-Split, Blendenfleck, Lichtlecks, Kamerawackeln, Spiegeln, Strudel, Wellen, Zuschneiden, Spiegelungen, Schlagschatten, Animationen grow / shrink / move / spin / wiggle… |
| **Farblooks** | 18 Lumetri-Presets: Teal Shadows Warm Skin, Night Exterior, Golden Dusk, Steel Blue, Hard Sun, Faded Print, Silver Retention, Cross Processed, Warm Negative, Neutral / Hard / Cold Mono, Sepia… |
| **Audioeffekte** | 58: EQ, Filter, Dynamik, Limiter, DeNoise, DeHummer, De-Esser, Hall, Delay, Tonhöhe, Sprachverbesserung… |
| **Übergänge** | 112 Video (Überblendungen, Abblenden, Push, Slide, Whip, Zoom-Blur, Glitch, Iris, Wischblenden…) + 3 Audio-Überblendungen |

## Beispiel

```json
{
  "input_path": "/home/ich/clips/strand.mp4",
  "effects": [
    { "effect": "vignette", "params": { "amount": -60 } },
    { "effect": "motion", "keyframes": { "scale": [ { "seconds": 0, "value": 100 }, { "seconds": 3, "value": 115 } ] } }
  ],
  "color_preset": "Golden Dusk",
  "texts": [ { "text": "Tag 1", "placement": "bottom", "color": "#ffcc00", "stroke_color": "#000000", "size": 110 } ],
  "fade_in": 0.5,
  "preset": "Social Vertical 1080×1920",
  "save_project": true,
  "interchange": ["fcpxml"]
}
```

## Voraussetzungen

- **FilmCraft** mit `filmcraft-cli` (getestet mit **0.2.1**); siehe [Plattformen](#plattformen)
- Node.js ≥ 20 (bei `.mcpb`-Installationen in Claude Desktop enthalten)

## Installation

### Claude Desktop (empfohlen, alle Plattformen)

1. Lade `filmcraft-mcp-server.mcpb` aus dem [neuesten Release](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest) herunter.
2. Doppelklicke darauf (oder ziehe es in Claude Desktop → *Einstellungen → Erweiterungen*) und klicke auf **Installieren**.
3. Optional: Liegt FilmCraft nicht an einem Standardort, gib den Ordner oder den Pfad von `filmcraft-cli` in den Einstellungen der Erweiterung an.

### Codex (OpenAI)

**Empfohlen — der Marketplace (erhält Updates):** *Plugins → Hinzufügen → Marketplace hinzufügen*, Quelle `jhonsu01/craft-marketplace`, Referenz `main`, dann **FilmCraft Bridge** aus **Craft Bridges** installieren ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Neue Versionen kommen durch Aktualisieren des Marketplace. Oder das Zip hochladen (Codex speichert es in Ihrem Konto und lehnt ein neueres Zip mit demselben Namen ab):

1. Laden Sie `filmcraft-mcp-server-<version>-codex.zip` aus dem [neuesten Release](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest) herunter.
2. In Codex: *Plugins → Hinzufügen → Neues Plugin*, das Zip wählen und auf **Plugin hinzufügen** klicken.
3. Codex startet den Server mit `node`, daher muss Node.js ≥ 20 im `PATH` liegen. Liegt FilmCraft nicht an einem Standardort, setzen Sie `FILMCRAFT_DIR` oder `FILMCRAFT_CLI` als Systemumgebungsvariablen (Codex hat für lokale Plugins kein Einstellungsformular).

### Claude Code / andere MCP-Clients

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

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `FILMCRAFT_DIR` | FilmCraft-Ordner, eine seiner ausführbaren Dateien, die Wurzel eines `.tar.gz` (mit `bin/`) oder `FilmCraft.app`. Standard: automatische Erkennung (siehe [Plattformen](#plattformen)) |
| `FILMCRAFT_CLI` | Pfad zu `filmcraft-cli` / `filmcraft-cli.exe` (hat Vorrang vor `FILMCRAFT_DIR`) |
| `FILMCRAFT_APP` | Pfad der Desktop-App, falls sie woanders liegt (z. B. ein Linux-AppImage) |
| `FILMCRAFT_DATA_DIR` | FilmCraft-Datenordner, für eigene Export-Presets |
| `FILMCRAFT_CONTROL_PORT` | Steuerport der Desktop-App (Standard 9876) |
| `FILMCRAFT_MCP_TIMEOUT` | Maximale Sekunden pro Engine-Befehl (Standard 3600) |

## Sicherheit

- Dateien werden **nie überschrieben**, außer mit `overwrite: true`; die Eingabe wird nie verändert.
- Alle Pfade müssen absolut sein.
- Alles läuft lokal ohne Netzwerkzugriff. Jeder Auftrag nutzt eine private Engine in einem temporären Ordner, der danach gelöscht wird.

## Entwicklung

```bash
npm run build       # TypeScript + Einzeldatei-Bundle (dist/bundle.cjs)
npm test            # Unit-Tests (Pfadlogik für Windows, macOS und Linux)
npm run test:e2e    # 21 End-to-End-Prüfungen über echtes MCP stdio (synthetisches Demo-Material von FilmCraft)
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
npm run pack:codex  # Codex-Plugin-Zip
```

Linux-Test in Docker (vorher `filmcraft-<version>-linux-x86_64.tar.gz` entpacken):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/pfad/zu/filmcraft-0.2.1-linux-x86_64:/opt/filmcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 && node scripts/e2e.mjs"
```

## Lizenz

Apache-2.0. FilmCraft ist © seiner Autoren (Storytold), doppelt lizenziert unter MIT / Apache-2.0.
Dieses Projekt ist weder mit FilmCraft noch mit Storytold verbunden oder von ihnen unterstützt. Adobe Premiere Pro ist eine Marke von Adobe.
