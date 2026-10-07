<p align="center"><img src="icon.png" width="120" alt="Ícono de FilmCraft Bridge"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <b>Español</b>
</p>

<p align="center">
  Deja que Claude edite video con el <b>FilmCraft</b> instalado en tu PC con Windows:<br>
  cortar, recortar, efectos, looks de color, títulos, velocidad, audio, transiciones, exportación y líneas de tiempo editables.
</p>

---

## Por qué

[FilmCraft](https://github.com/storytold/filmcraft) es un editor de video de código abierto, al nivel de Premiere, escrito en Rust. Cada acción es un comando del motor y trae una CLI sin interfaz (`filmcraft-cli`). Este servidor [Model Context Protocol](https://modelcontextprotocol.io) convierte ese motor en **herramientas de archivo a archivo** para Claude, para pedir cosas como:

> *"Corta cada video de `D:\clips` en trozos de 2 segundos, una carpeta por video."*
> *"Ponle viñeta, el look Golden Dusk y el título 'Día 1' abajo a `D:\viaje\a.mp4`."*
> *"Une estas tres tomas con un fundido cruzado y expórtalas para YouTube 1080p."*
> *"Dame la edición como proyecto de FilmCraft y como FCPXML para DaVinci."*

Inspirado en [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

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
| `convert_media` | Reexporta: códec, tamaño, fotogramas por segundo, bitrate, sonoridad, preset; extrae el audio |
| `get_media_info` | Contenedor, duración, códecs, tamaño, fps y audio |
| `render_frame` | Un fotograma de un archivo o `.fcproj` como PNG (Claude lo ve) |
| `list_catalog` | Efectos de video/audio, transiciones, looks Lumetri, presets de exportación, comandos |
| `run_commands` | Cualquiera de los 666 comandos del motor, con referencias `$items[0]` / `$steps[N].ruta` |
| `open_in_filmcraft` | Abre proyectos o medios en la app de FilmCraft |
| `get_filmcraft_status` | Instalación, versión, app / puerto de control, tamaño del catálogo |

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
  "input_path": "D:\\clips\\playa.mp4",
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

- Windows 10/11 x64
- **FilmCraft** (probado con **0.2.1**), con `filmcraft-cli.exe` en su carpeta de instalación
- Node.js ≥ 20 (incluido en Claude Desktop para instalaciones `.mcpb`)

## Instalación

### Claude Desktop (recomendado)

1. Descarga `filmcraft-mcp-server.mcpb` de la [última versión](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. Haz doble clic (o arrástralo a Claude Desktop → *Configuración → Extensiones*) y pulsa **Instalar**.
3. Opcional: si FilmCraft no está en `C:\Program Files\FilmCraft`, indica su carpeta en la configuración de la extensión.

### Claude Code / otros clientes MCP

```bash
git clone https://github.com/jhonsu01/filmcraft-mcp-server.git
cd filmcraft-mcp-server
npm install
npm run build
claude mcp add filmcraft -- node "%CD%\dist\bundle.cjs"
```

## Configuración

| Variable | Significado |
| --- | --- |
| `FILMCRAFT_DIR` | Carpeta de instalación de FilmCraft (o uno de sus `.exe`). Por defecto: `C:\Program Files\FilmCraft` |
| `FILMCRAFT_CLI` | Ruta de `filmcraft-cli.exe` (tiene prioridad sobre `FILMCRAFT_DIR`) |
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
npm test            # pruebas unitarias
npm run test:e2e    # 21 pruebas de extremo a extremo por MCP stdio real (metraje sintético de FilmCraft)
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
```

## Licencia

Apache-2.0. FilmCraft es © de sus autores (Storytold), con doble licencia MIT / Apache-2.0.
Este proyecto no está afiliado ni respaldado por FilmCraft ni Storytold. Adobe Premiere Pro es una marca de Adobe.
