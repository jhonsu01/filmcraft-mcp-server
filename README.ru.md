<p align="center"><img src="icon.png" width="120" alt="Значок FilmCraft Bridge"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <b>Русский</b> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  Позвольте Claude монтировать видео в <b>FilmCraft</b>, установленном на вашем компьютере, — <b>Windows, macOS и Linux</b>:<br>
  нарезка, обрезка, эффекты, цветовые стили, титры, скорость, звук, переходы, экспорт и редактируемые таймлайны.
</p>

---

## Зачем

[FilmCraft](https://github.com/storytold/filmcraft) — видеоредактор с открытым исходным кодом уровня Premiere, написанный на Rust. Каждое действие в нём — команда движка, а в комплекте есть консольный инструмент без интерфейса (`filmcraft-cli`). Этот сервер [Model Context Protocol](https://modelcontextprotocol.io) превращает движок в **инструменты «файл → файл»** для Claude, и можно просить, например:

> *«Нарежь каждое видео из `D:\clips` на куски по 2 секунды, по папке на видео».*
> *«Добавь виньетку, стиль Golden Dusk и титр „День 1“ внизу в `~/trip/a.mp4`».*
> *«Склей эти три плана через наплыв и экспортируй для YouTube 1080p».*
> *«Дай монтаж как проект FilmCraft и как FCPXML для DaVinci».*

Создано по образцу [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server).

## Платформы

| Система | Какой пакет FilmCraft установить | Где сервер его находит (без настройки) | Статус |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86) | MSI или портативный zip | `C:\Program Files\FilmCraft`, `%LOCALAPPDATA%\Programs\FilmCraft`, `PATH` | ✅ Проверено (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` или `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/filmcraft/bin`, `~/.local/bin`, `PATH` | ✅ Проверено (Debian 12, без графики, 21/21 e2e) |
| **macOS** 11+ (Apple silicon и Intel) | `.dmg` (приложение) **и** `filmcraft-cli-<версия>-macos-universal.zip` | `/Applications/FilmCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 Поддерживается, на Mac ещё не проверено |

Загрузки: [релизы FilmCraft](https://github.com/storytold/filmcraft/releases). Если установлено в другом месте, задайте `FILMCRAFT_DIR` (папка, корень `.tar.gz` или `FilmCraft.app`) или `FILMCRAFT_CLI`.

- **macOS:** в DMG только приложение. Распакуйте отдельный zip с `filmcraft-cli` и переместите `filmcraft-cli` в `/usr/local/bin` (или укажите путь в `FILMCRAFT_CLI`). Если macOS блокирует первый запуск, разрешите его в *Системных настройках → Конфиденциальность и безопасность*.
- **Linux:** AppImage и Flatpak содержат только приложение, без `filmcraft-cli`; используйте deb, rpm или tar.gz. Если приложение — AppImage, задайте `FILMCRAFT_APP`, чтобы `open_in_filmcraft` мог его запустить. На сервере без GPU в проверенной конфигурации использовались `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2`.

## Как это работает

| Часть | Что это |
| --- | --- |
| **Движок FilmCraft** (`filmcraft-cli mcp`) | Собственный движок FilmCraft без интерфейса: его кодеки H.264/HEVC/ProRes/AAC, композитор, эффекты, Lumetri, текстовый движок и экспортёры. Для каждой задачи запускается заново во временной папке. |
| **MCP-сервер** (Node.js) | 11 высокоуровневых инструментов. Отправляет движку команды по одной (id из ответа одной команды используются в следующей), проверяет пути и никогда ничего не перезаписывает. |
| **Живое приложение** (необязательно) | `open_in_filmcraft` / `run_commands live=true` управляют настольным приложением через его канал управления (`filmcraft --control 9876`). |

## Инструменты

| Инструмент | Что делает |
| --- | --- |
| `split_video` | Режет один или несколько файлов на куски по N секунд с точностью до кадра, по папке на файл (`<имя>_001.mp4`…) |
| `edit_video` | Видеоэффекты (с параметрами и ключевыми кадрами), стиль Lumetri, вшитые титры, скорость / реверс, аудиоэффекты, громкость, затемнения; для одного или многих файлов |
| `trim_video` | Оставляет отрезок времени, при желании с затемнениями |
| `concat_videos` | Склеивает видео, изображения и звук любым из 112 переходов |
| `convert_media` | Переэкспорт: кодек, размер, частота кадров, битрейт, громкость, пресет; извлечение звука |
| `get_media_info` | Контейнер, длительность, кодеки, размер кадра, частота кадров, звук |
| `render_frame` | Один кадр файла или `.fcproj` в PNG (Claude его видит) |
| `list_catalog` | Видео- и аудиоэффекты, переходы, стили Lumetri, пресеты экспорта, команды движка |
| `run_commands` | Любая из 666 команд движка, со ссылками `$items[0]` / `$steps[N].путь` |
| `open_in_filmcraft` | Открывает проекты или медиа в приложении FilmCraft |
| `get_filmcraft_status` | Платформа, установка, версия, приложение / порт управления, размер каталога |

## Что вы получаете

| | |
| --- | --- |
| **Вход** | MP4, MOV, MKV, WebM, AVI, MXF, MPEG-TS, GIF · WAV, MP3, FLAC, AIFF, Ogg, Opus, M4A · PNG, JPEG, TIFF, BMP, WebP, EXR, DPX… |
| **Экспорт (рендер)** | H.264 `.mp4` · ProRes / DNxHR / MJPEG `.mov` · MXF OP1a / OP-Atom · анимированный GIF · кадры PNG / TIFF / BMP · WAV / AIFF |
| **Пресеты экспорта** | 28: Match Source (3 битрейта), YouTube / Vimeo 1080p и 4K, Social Vertical 1080×1920, семейство ProRes 422, DNxHR, MXF, последовательности изображений, GIF, WAV… |
| **Редактируемые результаты** | `.fcproj` (проект FilmCraft) · OpenTimelineIO `.otio` · FCPXML (Final Cut / DaVinci) · `.xml` Premiere / FCP7 · `.edl` · AAF (Avid / Pro Tools) |
| **Видеоэффекты** | 130: размытия, резкость, чёрно-белое, уровни, ProcAmp, тонирование, Lumetri, мозаика, постеризация, шум, свечение, RGB split, блик объектива, засветки, тряска камеры, зеркало, завихрение, волны, кадрирование, отражения, тень, анимации grow / shrink / move / spin / wiggle… |
| **Цветовые стили** | 18 пресетов Lumetri: Teal Shadows Warm Skin, Night Exterior, Golden Dusk, Steel Blue, Hard Sun, Faded Print, Silver Retention, Cross Processed, Warm Negative, Neutral / Hard / Cold Mono, Sepia… |
| **Аудиоэффекты** | 58: эквалайзеры, фильтры, динамика, лимитер, DeNoise, DeHummer, де-эссер, реверберация, задержка, сдвиг высоты тона, улучшение речи… |
| **Переходы** | 112 видео (наплывы, затемнения, push, slide, whip, zoom blur, glitch, ирис, шторки…) + 3 аудиокроссфейда |

## Пример

```json
{
  "input_path": "/home/me/clips/beach.mp4",
  "effects": [
    { "effect": "vignette", "params": { "amount": -60 } },
    { "effect": "motion", "keyframes": { "scale": [ { "seconds": 0, "value": 100 }, { "seconds": 3, "value": 115 } ] } }
  ],
  "color_preset": "Golden Dusk",
  "texts": [ { "text": "День 1", "placement": "bottom", "color": "#ffcc00", "stroke_color": "#000000", "size": 110 } ],
  "fade_in": 0.5,
  "preset": "Social Vertical 1080×1920",
  "save_project": true,
  "interchange": ["fcpxml"]
}
```

## Требования

- **FilmCraft** с `filmcraft-cli` (проверено на **0.2.1**); см. [Платформы](#платформы)
- Node.js ≥ 20 (входит в Claude Desktop при установке `.mcpb`)

## Установка

### Claude Desktop (рекомендуется, все платформы)

1. Скачайте `filmcraft-mcp-server.mcpb` из [последнего релиза](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. Дважды щёлкните по нему (или перетащите в Claude Desktop → *Настройки → Расширения*) и нажмите **Установить**.
3. Необязательно: если FilmCraft установлен не в стандартное место, укажите его папку или путь к `filmcraft-cli` в настройках расширения.

### Codex (OpenAI)

**Рекомендуется — маркетплейс (получает обновления):** *Плагины → Добавить → Добавить маркетплейс*, источник `jhonsu01/craft-marketplace`, ссылка `main`, затем установите **FilmCraft Bridge** из **Craft Bridges** ([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). Новые версии приходят при обновлении маркетплейса. Или загрузите zip (Codex сохранит его в вашей учётной записи и отклонит более новый zip с тем же именем):

1. Скачайте `filmcraft-mcp-server-<версия>-codex.zip` из [последнего релиза](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest).
2. В Codex: *Плагины → Добавить → Новый плагин*, выберите zip и нажмите **Добавить плагин**.
3. Codex запускает сервер через `node`, поэтому Node.js ≥ 20 должен быть в `PATH`. Если FilmCraft установлен не в стандартное место, задайте `FILMCRAFT_DIR` или `FILMCRAFT_CLI` как системные переменные окружения (у Codex нет формы настроек для локальных плагинов).

### Claude Code / другие MCP-клиенты

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

## Настройка

| Переменная | Значение |
| --- | --- |
| `FILMCRAFT_DIR` | Папка FilmCraft, один из его исполняемых файлов, корень `.tar.gz` (с `bin/`) или `FilmCraft.app`. По умолчанию: автоопределение (см. [Платформы](#платформы)) |
| `FILMCRAFT_CLI` | Путь к `filmcraft-cli` / `filmcraft-cli.exe` (важнее, чем `FILMCRAFT_DIR`) |
| `FILMCRAFT_APP` | Путь к настольному приложению, если оно в другом месте (например, AppImage в Linux) |
| `FILMCRAFT_DATA_DIR` | Папка данных FilmCraft — для ваших собственных пресетов экспорта |
| `FILMCRAFT_CONTROL_PORT` | Порт управления настольным приложением (по умолчанию 9876) |
| `FILMCRAFT_MCP_TIMEOUT` | Максимум секунд на одну команду движка (по умолчанию 3600) |

## Безопасность

- Файлы **никогда не перезаписываются** без `overwrite: true`; исходный файл не изменяется.
- Все пути должны быть абсолютными.
- Всё работает локально, без доступа к сети. Каждая задача использует отдельный движок во временной папке, которая затем удаляется.

## Разработка

```bash
npm run build       # TypeScript + бандл в один файл (dist/bundle.cjs)
npm test            # модульные тесты (логика путей Windows, macOS и Linux)
npm run test:e2e    # 22 сквозная проверка через реальный MCP stdio (синтетическое демо-видео FilmCraft)
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
npm run pack:codex  # zip-плагин для Codex
```

Проверка Linux в Docker (сначала распакуйте `filmcraft-<версия>-linux-x86_64.tar.gz`):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/путь/к/filmcraft-0.2.1-linux-x86_64:/opt/filmcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 && node scripts/e2e.mjs"
```

## Лицензия

Apache-2.0. FilmCraft © его авторы (Storytold), двойная лицензия MIT / Apache-2.0.
Проект не связан с FilmCraft и Storytold и не одобрен ими. Adobe Premiere Pro — товарный знак Adobe.
