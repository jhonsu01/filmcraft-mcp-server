<p align="center"><img src="icon.png" width="120" alt="Icône de FilmCraft Bridge"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <b>Français</b> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Laissez Claude monter vos vidéos avec le <b>FilmCraft</b> installé sur votre ordinateur — <b>Windows, macOS et Linux</b> :<br>
  découpe, coupe, effets, looks couleur, titres, vitesse, audio, transitions, export et timelines modifiables.
</p>

---

## Pourquoi

[FilmCraft](https://github.com/storytold/filmcraft) est un logiciel de montage vidéo open source, du niveau de Premiere, écrit en Rust. Chaque action est une commande du moteur, et il fournit une CLI sans interface (`filmcraft-cli`). Ce serveur [Model Context Protocol](https://modelcontextprotocol.io) transforme ce moteur en **outils fichier vers fichier** pour Claude, afin de demander par exemple :

> *« Découpe chaque vidéo de `D:\clips` en morceaux de 2 secondes, un dossier par vidéo. »*
> *« Ajoute un vignettage, le look Golden Dusk et le titre « Jour 1 » en bas de `~/voyage/a.mp4`. »*
> *« Assemble ces trois plans avec un fondu enchaîné et exporte-les pour YouTube 1080p. »*
> *« Donne-moi le montage en projet FilmCraft et en FCPXML pour DaVinci. »*

Inspiré de [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plateformes

| Système | Paquet FilmCraft à installer | Où le serveur le trouve (sans réglage) | État |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86) | MSI ou zip portable | `C:\Program Files\FilmCraft`, `%LOCALAPPDATA%\Programs\FilmCraft`, `PATH` | ✅ Vérifié (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/filmcraft/bin`, `~/.local/bin`, `PATH` | ✅ Vérifié (Debian 12, sans interface, 21/21 e2e) |
| **macOS** 11+ (Apple silicon et Intel) | `.dmg` (l'app) **et** `filmcraft-cli-<version>-macos-universal.zip` | `/Applications/FilmCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Pris en charge, pas encore testé sur Mac |

Téléchargements : [versions de FilmCraft](https://github.com/storytold/filmcraft/releases). Ailleurs : définissez `FILMCRAFT_DIR` (dossier, racine du `.tar.gz` ou `FilmCraft.app`) ou `FILMCRAFT_CLI`.

- **macOS :** le DMG ne contient que l'app. Décompressez le zip séparé de `filmcraft-cli` et déplacez `filmcraft-cli` vers `/usr/local/bin` (ou faites pointer `FILMCRAFT_CLI` dessus). Si macOS bloque son premier lancement, autorisez-le dans *Réglages Système → Confidentialité et sécurité*.
- **Linux :** l'AppImage et le Flatpak ne contiennent que l'app, sans `filmcraft-cli` ; utilisez le deb, le rpm ou le tar.gz. Si l'app est une AppImage, définissez `FILMCRAFT_APP` pour que `open_in_filmcraft` puisse la lancer. Sur un serveur sans GPU, la configuration vérifiée utilisait `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2`.

## Fonctionnement

| Partie | Description |
| --- | --- |
| **Moteur FilmCraft** (`filmcraft-cli mcp`) | Le moteur sans interface de FilmCraft : ses codecs H.264/HEVC/ProRes/AAC, son compositeur, ses effets, Lumetri, son moteur de texte et ses exportateurs. Démarré à neuf pour chaque tâche dans un dossier temporaire privé. |
| **Serveur MCP** (Node.js) | 11 outils de haut niveau. Il envoie les commandes au moteur une par une (les ids renvoyés par l'une servent à la suivante), valide les chemins et n'écrase jamais rien. |
| **App en direct** (optionnel) | `open_in_filmcraft` / `run_commands live=true` pilotent l'application de bureau via son canal de contrôle (`filmcraft --control 9876`). |

## Outils

| Outil | Rôle |
| --- | --- |
| `split_video` | Découpe un ou plusieurs fichiers en morceaux de N secondes, à l'image près, un dossier par fichier (`<nom>_001.mp4`…) |
| `edit_video` | Effets vidéo (paramètres et images clés), look Lumetri, titres incrustés, vitesse / inversion, effets audio, volume, fondus ; sur un ou plusieurs fichiers |
| `trim_video` | Garde un intervalle de temps, avec fondus optionnels |
| `concat_videos` | Assemble vidéos, images et audio avec l'une des 112 transitions |
| `convert_media` | Réexporte : codec, taille, cadence, débit, loudness, préréglage ; extrait l'audio |
| `get_media_info` | Conteneur, durée, codecs, taille, cadence et audio |
| `render_frame` | Une image d'un fichier ou d'un `.fcproj` en PNG (Claude la voit) |
| `list_catalog` | Effets vidéo/audio, transitions, looks Lumetri, préréglages d'export, commandes |
| `run_commands` | N'importe laquelle des 666 commandes du moteur, avec références `$items[0]` / `$steps[N].chemin` |
| `open_in_filmcraft` | Ouvre des projets ou des médias dans l'app FilmCraft |
| `get_filmcraft_status` | Plateforme, installation, version, app / port de contrôle, taille du catalogue |

## Ce que vous obtenez

| | |
| --- | --- |
| **Entrée** | MP4, MOV, MKV, WebM, AVI, MXF, MPEG-TS, GIF · WAV, MP3, FLAC, AIFF, Ogg, Opus, M4A · PNG, JPEG, TIFF, BMP, WebP, EXR, DPX… |
| **Export (rendu)** | H.264 `.mp4` · ProRes / DNxHR / MJPEG `.mov` · MXF OP1a / OP-Atom · GIF animé · images PNG / TIFF / BMP · WAV / AIFF |
| **Préréglages** | 28 : Match Source (3 débits), YouTube / Vimeo 1080p et 4K, Social Vertical 1080×1920, famille ProRes 422, DNxHR, MXF, séquences d'images, GIF, WAV… |
| **Sorties modifiables** | `.fcproj` (projet FilmCraft) · OpenTimelineIO `.otio` · FCPXML (Final Cut / DaVinci) · `.xml` Premiere / FCP7 · `.edl` · AAF (Avid / Pro Tools) |
| **Effets vidéo** | 130 : flous, netteté, noir et blanc, niveaux, ProcAmp, teinte, Lumetri, mosaïque, postérisation, bruit, lueur, RGB split, reflet d'objectif, fuites de lumière, tremblement de caméra, miroir, tourbillon, ondulation, recadrage, retournements, ombre portée, animations grow / shrink / move / spin / wiggle… |
| **Looks couleur** | 18 préréglages Lumetri : Teal Shadows Warm Skin, Night Exterior, Golden Dusk, Steel Blue, Hard Sun, Faded Print, Silver Retention, Cross Processed, Warm Negative, Neutral / Hard / Cold Mono, Sepia… |
| **Effets audio** | 58 : égaliseurs, filtres, dynamique, limiteur, DeNoise, DeHummer, De-esser, réverbération, delay, changement de hauteur, amélioration de la voix… |
| **Transitions** | 112 vidéo (fondus, fondus au noir, push, slide, whip, zoom blur, glitch, iris, volets…) + 3 fondus audio |

## Exemple

```json
{
  "input_path": "/home/moi/clips/plage.mp4",
  "effects": [
    { "effect": "vignette", "params": { "amount": -60 } },
    { "effect": "motion", "keyframes": { "scale": [ { "seconds": 0, "value": 100 }, { "seconds": 3, "value": 115 } ] } }
  ],
  "color_preset": "Golden Dusk",
  "texts": [ { "text": "Jour 1", "placement": "bottom", "color": "#ffcc00", "stroke_color": "#000000", "size": 110 } ],
  "fade_in": 0.5,
  "preset": "Social Vertical 1080×1920",
  "save_project": true,
  "interchange": ["fcpxml"]
}
```

## Prérequis

- **FilmCraft** avec `filmcraft-cli` (testé avec **0.2.1**) ; voir [Plateformes](#plateformes)
- Node.js ≥ 20 (fourni avec Claude Desktop pour les installations `.mcpb`)

## Installation

### Claude Desktop (recommandé, toutes plateformes)

1. Téléchargez `filmcraft-mcp-server.mcpb` depuis la [dernière version](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. Double-cliquez dessus (ou glissez-le dans Claude Desktop → *Paramètres → Extensions*) puis cliquez sur **Installer**.
3. Optionnel : si FilmCraft n'est pas à un emplacement standard, indiquez son dossier ou le chemin de `filmcraft-cli` dans les réglages de l'extension.

### Claude Code / autres clients MCP

```bash
git clone https://github.com/jhonsu01/filmcraft-mcp-server.git
cd filmcraft-mcp-server
npm install
npm run build
```

Windows :

```bash
claude mcp add filmcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux :

```bash
claude mcp add filmcraft -- node "$PWD/dist/bundle.cjs"
```

## Configuration

| Variable | Signification |
| --- | --- |
| `FILMCRAFT_DIR` | Dossier de FilmCraft, l'un de ses exécutables, la racine d'un `.tar.gz` (avec `bin/`) ou `FilmCraft.app`. Par défaut : détection automatique (voir [Plateformes](#plateformes)) |
| `FILMCRAFT_CLI` | Chemin de `filmcraft-cli` / `filmcraft-cli.exe` (prioritaire sur `FILMCRAFT_DIR`) |
| `FILMCRAFT_APP` | Chemin de l'app de bureau si elle est ailleurs (par ex. une AppImage Linux) |
| `FILMCRAFT_DATA_DIR` | Dossier de données de FilmCraft, pour vos propres préréglages d'export |
| `FILMCRAFT_CONTROL_PORT` | Port de contrôle de l'app de bureau (9876 par défaut) |
| `FILMCRAFT_MCP_TIMEOUT` | Durée maximale en secondes par commande du moteur (3600 par défaut) |

## Sécurité

- Les fichiers ne sont **jamais écrasés** sans `overwrite: true` ; l'entrée n'est jamais modifiée.
- Tous les chemins doivent être absolus.
- Tout s'exécute en local, sans accès réseau. Chaque tâche utilise un moteur privé dans un dossier temporaire supprimé ensuite.

## Développement

```bash
npm run build       # TypeScript + bundle en un seul fichier (dist/bundle.cjs)
npm test            # tests unitaires (logique de chemins Windows, macOS et Linux)
npm run test:e2e    # 21 tests de bout en bout via MCP stdio réel (images de démonstration synthétiques de FilmCraft)
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
```

Test Linux dans Docker (décompressez d'abord `filmcraft-<version>-linux-x86_64.tar.gz`) :

```bash
docker run --rm -v "$PWD:/work:ro" -v "/chemin/vers/filmcraft-0.2.1-linux-x86_64:/opt/filmcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 && node scripts/e2e.mjs"
```

## Licence

Apache-2.0. FilmCraft est © ses auteurs (Storytold), sous double licence MIT / Apache-2.0.
Ce projet n'est ni affilié à FilmCraft ou Storytold, ni approuvé par eux. Adobe Premiere Pro est une marque d'Adobe.
