<p align="center"><img src="icon.png" width="120" alt="Ícone do FilmCraft Bridge"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <b>Português</b> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Deixe o Claude editar vídeo com o <b>FilmCraft</b> instalado no seu computador — <b>Windows, macOS e Linux</b>:<br>
  dividir, cortar, efeitos, looks de cor, títulos, velocidade, áudio, transições, exportação e linhas do tempo editáveis.
</p>

---

## Por quê

O [FilmCraft](https://github.com/storytold/filmcraft) é um editor de vídeo de código aberto, no nível do Premiere, escrito em Rust. Cada ação é um comando do motor, e ele traz uma CLI sem interface (`filmcraft-cli`). Este servidor [Model Context Protocol](https://modelcontextprotocol.io) transforma esse motor em **ferramentas de arquivo para arquivo** para o Claude, para pedir coisas como:

> *"Divida cada vídeo de `D:\clips` em partes de 2 segundos, uma pasta por vídeo."*
> *"Adicione vinheta, o look Golden Dusk e o título 'Dia 1' embaixo em `~/viagem/a.mp4`."*
> *"Junte estas três tomadas com uma dissolução cruzada e exporte para YouTube 1080p."*
> *"Me dê a edição como projeto do FilmCraft e como FCPXML para o DaVinci."*

Inspirado no [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Plataformas

| Sistema | Pacote do FilmCraft a instalar | Onde o servidor o encontra (sem configurar) | Status |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86) | MSI ou zip portátil | `C:\Program Files\FilmCraft`, `%LOCALAPPDATA%\Programs\FilmCraft`, `PATH` | ✅ Verificado (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` ou `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/filmcraft/bin`, `~/.local/bin`, `PATH` | ✅ Verificado (Debian 12, sem interface, 21/21 e2e) |
| **macOS** 11+ (Apple silicon e Intel) | `.dmg` (o app) **mais** `filmcraft-cli-<versão>-macos-universal.zip` | `/Applications/FilmCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Suportado, ainda não testado em um Mac |

Downloads: [versões do FilmCraft](https://github.com/storytold/filmcraft/releases). Em qualquer outro local: defina `FILMCRAFT_DIR` (pasta, raiz do `.tar.gz` ou `FilmCraft.app`) ou `FILMCRAFT_CLI`.

- **macOS:** o DMG contém apenas o app. Descompacte o zip separado do `filmcraft-cli` e mova `filmcraft-cli` para `/usr/local/bin` (ou aponte `FILMCRAFT_CLI` para ele). Se o macOS bloquear a primeira execução, permita em *Ajustes do Sistema → Privacidade e Segurança*.
- **Linux:** o AppImage e o Flatpak contêm apenas o app, sem `filmcraft-cli`; use o deb, o rpm ou o tar.gz. Se o app for um AppImage, defina `FILMCRAFT_APP` para que `open_in_filmcraft` consiga iniciá-lo. Em um servidor sem GPU, a configuração verificada usou `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2`.

## Como funciona

| Parte | O que é |
| --- | --- |
| **Motor do FilmCraft** (`filmcraft-cli mcp`) | O próprio motor sem interface do FilmCraft: seus codecs H.264/HEVC/ProRes/AAC, compositor, efeitos, Lumetri, motor de texto e exportadores. Iniciado do zero para cada tarefa em uma pasta temporária privada. |
| **Servidor MCP** (Node.js) | 11 ferramentas de alto nível. Conversa com o motor um comando por vez (os ids que um devolve alimentam o próximo), valida caminhos e nunca sobrescreve. |
| **App ao vivo** (opcional) | `open_in_filmcraft` / `run_commands live=true` controlam o app de desktop pelo canal de controle (`filmcraft --control 9876`). |

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `split_video` | Divide um ou vários arquivos em partes de N segundos, com precisão de quadro, uma pasta por arquivo (`<nome>_001.mp4`…) |
| `edit_video` | Efeitos de vídeo (com parâmetros e keyframes), look Lumetri, títulos gravados na imagem, velocidade / reverso, efeitos de áudio, volume, fades; em um ou vários arquivos |
| `trim_video` | Mantém um intervalo de tempo, com fades opcionais |
| `concat_videos` | Junta vídeos, imagens e áudio com qualquer uma de 112 transições |
| `convert_media` | Reexporta: codec, tamanho, fps, bitrate, loudness, preset; extrai o áudio |
| `get_media_info` | Contêiner, duração, codecs, tamanho, fps e áudio |
| `render_frame` | Um quadro de um arquivo ou `.fcproj` como PNG (o Claude o vê) |
| `list_catalog` | Efeitos de vídeo/áudio, transições, looks Lumetri, presets de exportação, comandos |
| `run_commands` | Qualquer um dos 666 comandos do motor, com referências `$items[0]` / `$steps[N].caminho` |
| `open_in_filmcraft` | Abre projetos ou mídias no app FilmCraft |
| `get_filmcraft_status` | Plataforma, instalação, versão, app / porta de controle, tamanho do catálogo |

## O que você obtém

| | |
| --- | --- |
| **Entrada** | MP4, MOV, MKV, WebM, AVI, MXF, MPEG-TS, GIF · WAV, MP3, FLAC, AIFF, Ogg, Opus, M4A · PNG, JPEG, TIFF, BMP, WebP, EXR, DPX… |
| **Exportação (render)** | H.264 `.mp4` · ProRes / DNxHR / MJPEG `.mov` · MXF OP1a / OP-Atom · GIF animado · quadros PNG / TIFF / BMP · WAV / AIFF |
| **Presets** | 28: Match Source (3 bitrates), YouTube / Vimeo 1080p e 4K, Social Vertical 1080×1920, família ProRes 422, DNxHR, MXF, sequências de imagens, GIF, WAV… |
| **Saídas editáveis** | `.fcproj` (projeto do FilmCraft) · OpenTimelineIO `.otio` · FCPXML (Final Cut / DaVinci) · `.xml` do Premiere / FCP7 · `.edl` · AAF (Avid / Pro Tools) |
| **Efeitos de vídeo** | 130: desfoques, nitidez, preto e branco, níveis, ProcAmp, tonalidade, Lumetri, mosaico, posterizar, ruído, brilho, RGB split, reflexo de lente, vazamentos de luz, tremor de câmera, espelho, redemoinho, ondas, recorte, espelhamentos, sombra, animações grow / shrink / move / spin / wiggle… |
| **Looks de cor** | 18 presets Lumetri: Teal Shadows Warm Skin, Night Exterior, Golden Dusk, Steel Blue, Hard Sun, Faded Print, Silver Retention, Cross Processed, Warm Negative, Neutral / Hard / Cold Mono, Sepia… |
| **Efeitos de áudio** | 58: equalizadores, filtros, dinâmica, limitador, DeNoise, DeHummer, De-esser, reverb, delay, mudança de tom, realce de voz… |
| **Transições** | 112 de vídeo (dissoluções, fades, push, slide, whip, zoom blur, glitch, íris, wipes…) + 3 crossfades de áudio |

## Exemplo

```json
{
  "input_path": "/home/eu/clips/praia.mp4",
  "effects": [
    { "effect": "vignette", "params": { "amount": -60 } },
    { "effect": "motion", "keyframes": { "scale": [ { "seconds": 0, "value": 100 }, { "seconds": 3, "value": 115 } ] } }
  ],
  "color_preset": "Golden Dusk",
  "texts": [ { "text": "Dia 1", "placement": "bottom", "color": "#ffcc00", "stroke_color": "#000000", "size": 110 } ],
  "fade_in": 0.5,
  "preset": "Social Vertical 1080×1920",
  "save_project": true,
  "interchange": ["fcpxml"]
}
```

## Requisitos

- **FilmCraft** com `filmcraft-cli` (testado com **0.2.1**); veja [Plataformas](#plataformas)
- Node.js ≥ 20 (incluído no Claude Desktop para instalações `.mcpb`)

## Instalação

### Claude Desktop (recomendado, todas as plataformas)

1. Baixe `filmcraft-mcp-server.mcpb` da [versão mais recente](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. Clique duas vezes (ou arraste para o Claude Desktop → *Configurações → Extensões*) e clique em **Instalar**.
3. Opcional: se o FilmCraft não estiver em um local padrão, informe a pasta ou o caminho do `filmcraft-cli` nas configurações da extensão.

### Codex (OpenAI)

**Recomendado — o marketplace (recebe atualizações):** *Plugins → Adicionar → Adicionar marketplace*, origem `jhonsu01/craft-marketplace`, referência `main`, e instale o **FilmCraft Bridge** em **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). As novas versões chegam ao atualizar o marketplace. Ou envie o zip (o Codex o guarda na sua conta e recusa um zip mais novo com o mesmo nome):

1. Baixe `filmcraft-mcp-server-<versão>-codex.zip` da [versão mais recente](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. No Codex: *Plugins → Adicionar → Novo plugin*, escolha o zip e clique em **Adicionar plugin**.
3. O Codex inicia o servidor com `node`, então o Node.js ≥ 20 precisa estar no `PATH`. Se o FilmCraft não estiver em um local padrão, defina `FILMCRAFT_DIR` ou `FILMCRAFT_CLI` como variáveis de ambiente do sistema (o Codex não tem formulário de configuração para plugins locais).

### Claude Code / outros clientes MCP

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

## Configuração

| Variável | Significado |
| --- | --- |
| `FILMCRAFT_DIR` | Pasta do FilmCraft, um de seus executáveis, a raiz de um `.tar.gz` (com `bin/`) ou `FilmCraft.app`. Padrão: detecção automática (veja [Plataformas](#plataformas)) |
| `FILMCRAFT_CLI` | Caminho do `filmcraft-cli` / `filmcraft-cli.exe` (tem prioridade sobre `FILMCRAFT_DIR`) |
| `FILMCRAFT_APP` | Caminho do app de desktop quando está em outro lugar (ex.: um AppImage no Linux) |
| `FILMCRAFT_DATA_DIR` | Pasta de dados do FilmCraft, para seus próprios presets de exportação |
| `FILMCRAFT_CONTROL_PORT` | Porta de controle do app de desktop (padrão 9876) |
| `FILMCRAFT_MCP_TIMEOUT` | Máximo de segundos por comando do motor (padrão 3600) |

## Segurança

- Os arquivos **nunca são sobrescritos**, exceto com `overwrite: true`; a entrada nunca é modificada.
- Todos os caminhos devem ser absolutos.
- Tudo roda localmente, sem acesso à rede. Cada tarefa usa um motor privado em uma pasta temporária que é apagada ao final.

## Desenvolvimento

```bash
npm run build       # TypeScript + bundle de arquivo único (dist/bundle.cjs)
npm test            # testes unitários (lógica de caminhos de Windows, macOS e Linux)
npm run test:e2e    # 22 testes de ponta a ponta via MCP stdio real (vídeo sintético do FilmCraft)
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
npm run pack:codex  # zip de plugin para o Codex
```

Teste de Linux no Docker (descompacte antes `filmcraft-<versão>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/caminho/para/filmcraft-0.2.1-linux-x86_64:/opt/filmcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 && node scripts/e2e.mjs"
```

## Licença

Apache-2.0. O FilmCraft é © de seus autores (Storytold), com licença dupla MIT / Apache-2.0.
Este projeto não é afiliado nem endossado pelo FilmCraft ou pela Storytold. Adobe Premiere Pro é marca da Adobe.
