<p align="center"><img src="icon.png" width="120" alt="Ícono de FilmCraft Bridge"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <b>Español</b> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deja que Claude edite video con el <b>FilmCraft</b> instalado en tu equipo — <b>Windows, macOS y Linux</b>:<br>
  cortar, recortar, efectos, looks de color, títulos, velocidad, audio, transiciones, exportación y líneas de tiempo editables.
</p>

---

## Por qué

[FilmCraft](https://github.com/storytold/filmcraft) es un editor de video de código abierto, al nivel de Premiere, escrito en Rust. Cada acción es un comando del motor y trae una CLI sin interfaz (`filmcraft-cli`). Este servidor [Model Context Protocol](https://modelcontextprotocol.io) convierte ese motor en **herramientas de archivo a archivo** para Claude, para pedir cosas como:

> *"Corta cada video de `D:\clips` en trozos de 2 segundos, una carpeta por video."*
> *"Ponle viñeta, el look Golden Dusk y el título 'Día 1' abajo a `~/viaje/a.mp4`."*
> *"Une estas tres tomas con un fundido cruzado y expórtalas para YouTube 1080p."*
> *"Dame la edición como proyecto de FilmCraft y como FCPXML para DaVinci."*

Inspirado en [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| Sistema | Paquete de FilmCraft a instalar | Dónde lo encuentra el servidor (sin configurar) | Estado |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86) | MSI o zip portable | `C:\Program Files\FilmCraft`, `%LOCALAPPDATA%\Programs\FilmCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` o `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/filmcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sin interfaz, 21/21 e2e) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (la app) **más** `filmcraft-cli-<versión>-macos-universal.zip` | `/Applications/FilmCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Soportado, aún sin probar en un Mac |

Descargas: [versiones de FilmCraft](https://github.com/storytold/filmcraft/releases). En cualquier otra ubicación: define `FILMCRAFT_DIR` (carpeta, raíz del `.tar.gz` o `FilmCraft.app`) o `FILMCRAFT_CLI`.

- **macOS:** el DMG solo trae la app. Descomprime el zip aparte de `filmcraft-cli` y mueve `filmcraft-cli` a `/usr/local/bin` (o apunta `FILMCRAFT_CLI` a él). Si macOS bloquea su primera ejecución, permítela en *Ajustes del Sistema → Privacidad y seguridad*.
- **Linux:** el AppImage y el Flatpak solo traen la app, no `filmcraft-cli`; usa el deb, el rpm o el tar.gz. Si la app es un AppImage, define `FILMCRAFT_APP` para que `open_in_filmcraft` pueda iniciarla. En un servidor sin GPU, la configuración verificada usó `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2`.

## Cómo funciona

| Parte | Qué es |
| --- | --- |
| **Motor de FilmCraft** (`filmcraft-cli mcp`) | El propio motor sin interfaz de FilmCraft: sus códecs H.264/HEVC/ProRes/AAC, compositor, efectos, Lumetri, motor de texto y exportadores. Se inicia limpio para cada trabajo en una carpeta temporal privada. |
| **Servidor MCP** (Node.js) | 11 herramientas de alto nivel. Habla con el motor comando a comando (los ids que devuelve uno alimentan al siguiente), valida rutas y nunca sobrescribe. |
| **App en vivo** (opcional) | `open_in_filmcraft` / `run_commands live=true` controlan la app de escritorio por su canal de control (`filmcraft --control 9876`). |

## Herramientas

| Herramienta | Qué hace |
| --- | --- |
| `split_video` | Corta uno o varios archivos en trozos de N segundos, exactos al fotograma, una carpeta por archivo (`<nombre>_001.mp4`…) |
| `edit_video` | Efectos de video (con parámetros y fotogramas clave), look Lumetri, títulos incrustados, velocidad / reversa, efectos de audio, volumen, fundidos; en uno o varios archivos |
| `trim_video` | Conserva un rango de tiempo, con fundidos opcionales |
| `concat_videos` | Une videos, imágenes y audio con cualquiera de 112 transiciones |
| `convert_media` | Reexporta: códec, tamaño, fps, bitrate, sonoridad, preset; extrae el audio |
| `get_media_info` | Contenedor, duración, códecs, tamaño, fps y audio |
| `render_frame` | Un fotograma de un archivo o `.fcproj` como PNG (Claude lo ve) |
| `list_catalog` | Efectos de video/audio, transiciones, looks Lumetri, presets de exportación, comandos |
| `run_commands` | Cualquiera de los 666 comandos del motor, con referencias `$items[0]` / `$steps[N].ruta` |
| `open_in_filmcraft` | Abre proyectos o medios en la app de FilmCraft |
| `get_filmcraft_status` | Plataforma, instalación, versión, app / puerto de control, tamaño del catálogo |

## Qué obtienes

| | |
| --- | --- |
| **Entrada** | MP4, MOV, MKV, WebM, AVI, MXF, MPEG-TS, GIF · WAV, MP3, FLAC, AIFF, Ogg, Opus, M4A · PNG, JPEG, TIFF, BMP, WebP, EXR, DPX… |
| **Exportación (render)** | H.264 `.mp4` · ProRes / DNxHR / MJPEG `.mov` · MXF OP1a / OP-Atom · GIF animado · fotogramas PNG / TIFF / BMP · WAV / AIFF |
| **Presets** | 28: Match Source (3 bitrates), YouTube / Vimeo 1080p y 4K, Social Vertical 1080×1920, familia ProRes 422, DNxHR, MXF, secuencias de imágenes, GIF, WAV… |
| **Salidas editables** | `.fcproj` (proyecto de FilmCraft) · OpenTimelineIO `.otio` · FCPXML (Final Cut / DaVinci) · `.xml` de Premiere / FCP7 · `.edl` · AAF (Avid / Pro Tools) |
| **Efectos de video** | 130: desenfoques, enfoque, blanco y negro, niveles, ProcAmp, tinte, Lumetri, mosaico, posterizar, ruido, brillo, RGB split, destello de lente, fugas de luz, temblor de cámara, espejo, remolino, ondas, recorte, volteos, sombra, animaciones grow / shrink / move / spin / wiggle… |
| **Looks de color** | 18 presets Lumetri: Teal Shadows Warm Skin, Night Exterior, Golden Dusk, Steel Blue, Hard Sun, Faded Print, Silver Retention, Cross Processed, Warm Negative, Neutral / Hard / Cold Mono, Sepia… |
| **Efectos de audio** | 58: ecualizadores, filtros, dinámica, limitador, DeNoise, DeHummer, De-esser, reverberación, delay, cambio de tono, realce de voz… |
| **Transiciones** | 112 de video (disoluciones, fundidos, push, slide, whip, zoom blur, glitch, iris, barridos…) + 3 fundidos de audio |

## Ejemplo

```json
{
  "input_path": "/home/yo/clips/playa.mp4",
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

## Requisitos

- **FilmCraft** con `filmcraft-cli` (probado con **0.2.1**); ver [Plataformas](#plataformas)
- Node.js ≥ 20 (incluido en Claude Desktop para instalaciones `.mcpb`)

## Instalación

### Claude Desktop (recomendado, todas las plataformas)

1. Descarga `filmcraft-mcp-server.mcpb` de la [última versión](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. Haz doble clic (o arrástralo a Claude Desktop → *Configuración → Extensiones*) y pulsa **Instalar**.
3. Opcional: si FilmCraft no está en una ubicación estándar, indica su carpeta o la ruta de `filmcraft-cli` en la configuración de la extensión.

### Codex (OpenAI)

**Recomendado — el marketplace (recibe actualizaciones):** *Complementos → Añadir → Añadir marketplace*, origen `jhonsu01/craft-marketplace`, referencia `main`, y luego instala **FilmCraft Bridge** desde **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Las versiones nuevas llegan al actualizar el marketplace. O sube el zip (Codex lo guarda en tu cuenta y rechaza un zip más nuevo con el mismo nombre):

1. Descarga `filmcraft-mcp-server-<versión>-codex.zip` de la [última versión](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. En Codex: *Complementos → Añadir → Nuevo complemento*, elige el zip y pulsa **Añadir complemento**.
3. Codex arranca el servidor con `node`, así que Node.js ≥ 20 debe estar en el `PATH`. Si FilmCraft no está en una ubicación estándar, define `FILMCRAFT_DIR` o `FILMCRAFT_CLI` como variables de entorno del sistema (Codex no tiene formulario de configuración para complementos locales).

### DeepSeek Harness

1. *Plugins → Add plugin*, escribe `github:jhonsu01/craft-marketplace#path:/plugins/filmcraft-mcp-server` y pulsa **Install** y luego **Enable now**.
2. Harness arranca el servidor con su propio cliente MCP y `node` (Node.js ≥ 20 en el `PATH`); las herramientas aparecen como `mcp__filmcraft__<herramienta>` y los archivos de salida como tarjetas que se abren en Harness.
3. Harness aún no actualiza los plugins por sí solo: para actualizar, desinstala el plugin y vuelve a instalarlo con la misma dirección.

### Claude Code / otros clientes MCP

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

## Configuración

| Variable | Significado |
| --- | --- |
| `FILMCRAFT_DIR` | Carpeta de FilmCraft, uno de sus ejecutables, la raíz de un `.tar.gz` (con `bin/`) o `FilmCraft.app`. Por defecto: detección automática (ver [Plataformas](#plataformas)) |
| `FILMCRAFT_CLI` | Ruta de `filmcraft-cli` / `filmcraft-cli.exe` (tiene prioridad sobre `FILMCRAFT_DIR`) |
| `FILMCRAFT_APP` | Ruta de la app de escritorio si está en otro lugar (p. ej. un AppImage de Linux) |
| `FILMCRAFT_DATA_DIR` | Carpeta de datos de FilmCraft, para tus propios presets de exportación |
| `FILMCRAFT_CONTROL_PORT` | Puerto de control de la app de escritorio (por defecto 9876) |
| `FILMCRAFT_MCP_TIMEOUT` | Segundos máximos por comando del motor (por defecto 3600) |

## Seguridad

- Los archivos **nunca se sobrescriben** salvo con `overwrite: true`; la entrada nunca se modifica.
- Todas las rutas deben ser absolutas.
- Todo se ejecuta en local, sin acceso a red. Cada trabajo usa un motor privado en una carpeta temporal que se borra al terminar.

## Desarrollo

```bash
npm run build       # TypeScript + bundle de un solo archivo (dist/bundle.cjs)
npm test            # pruebas unitarias (lógica de rutas de Windows, macOS y Linux)
npm run test:e2e    # 22 pruebas de extremo a extremo por MCP stdio real (metraje sintético de FilmCraft)
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
npm run pack:codex  # zip de complemento para Codex
```

Prueba de Linux en Docker (descomprime antes `filmcraft-<versión>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/ruta/a/filmcraft-0.2.1-linux-x86_64:/opt/filmcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 && node scripts/e2e.mjs"
```

## Licencia

Apache-2.0. FilmCraft es © de sus autores (Storytold), con doble licencia MIT / Apache-2.0.
Este proyecto no está afiliado ni respaldado por FilmCraft ni Storytold. Adobe Premiere Pro es una marca de Adobe.
