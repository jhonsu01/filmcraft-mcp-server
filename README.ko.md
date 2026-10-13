<p align="center"><img src="icon.png" width="120" alt="FilmCraft Bridge 아이콘"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <b>한국어</b>
</p>

<p align="center">
  컴퓨터에 설치된 <b>FilmCraft</b>로 Claude가 영상을 편집하게 하세요 — <b>Windows, macOS, Linux</b> 지원:<br>
  분할, 트리밍, 효과, 컬러 룩, 자막·타이틀, 속도, 오디오, 트랜지션, 내보내기, 그리고 다시 편집할 수 있는 타임라인.
</p>

---

## 왜 필요한가

[FilmCraft](https://github.com/storytold/filmcraft)는 Rust로 작성된 Premiere급 오픈소스 영상 편집기입니다. 모든 동작이 엔진 명령이며, 화면 없이 동작하는 CLI(`filmcraft-cli`)도 함께 제공됩니다. 이 [Model Context Protocol](https://modelcontextprotocol.io) 서버는 그 엔진을 Claude용 **"파일을 넣고 파일을 받는" 도구**로 바꿔 주므로, 다음처럼 요청할 수 있습니다.

> *"`D:\clips`의 모든 영상을 2초씩 나누고, 영상마다 폴더를 따로 만들어 줘."*
> *"`~/trip/a.mp4`에 비네트, Golden Dusk 룩, 하단에 '1일차' 타이틀을 넣어 줘."*
> *"이 세 컷을 크로스 디졸브로 이어서 YouTube 1080p용으로 내보내 줘."*
> *"이 편집을 FilmCraft 프로젝트와 DaVinci용 FCPXML로 줘."*

[audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)에서 영감을 받았습니다.

## 지원 플랫폼

| 운영체제 | 설치할 FilmCraft 패키지 | 서버가 자동으로 찾는 위치(설정 불필요) | 상태 |
| --- | --- | --- | --- |
| **Windows** 10/11 (x64, x86) | MSI 또는 포터블 zip | `C:\Program Files\FilmCraft`, `%LOCALAPPDATA%\Programs\FilmCraft`, `PATH` | ✅ 검증됨 (Windows 11) |
| **Linux** (x86_64, aarch64, glibc ≥ 2.35) | `.deb`, `.rpm` 또는 `.tar.gz` | `/usr/bin`, `/usr/local/bin`, `/opt/filmcraft/bin`, `~/.local/bin`, `PATH` | ✅ 검증됨 (Debian 12, 화면 없음, e2e 21/21) |
| **macOS** 11 이상 (Apple 실리콘, Intel) | `.dmg`(앱) **그리고** `filmcraft-cli-<버전>-macos-universal.zip` | `/Applications/FilmCraft.app`, `/usr/local/bin`, `/opt/homebrew/bin`, `~/.local/bin`, `~/bin`, `PATH` | 🟡 지원됨, Mac 실기기에서는 아직 미검증 |

다운로드: [FilmCraft 릴리스](https://github.com/storytold/filmcraft/releases). 다른 위치에 설치했다면 `FILMCRAFT_DIR`(폴더, `.tar.gz` 루트 또는 `FilmCraft.app`)이나 `FILMCRAFT_CLI`를 설정하세요.

- **macOS:** DMG에는 앱만 들어 있습니다. 별도로 제공되는 `filmcraft-cli` zip을 풀고 `filmcraft-cli`를 `/usr/local/bin`으로 옮기세요(또는 `FILMCRAFT_CLI`로 위치를 지정). macOS가 첫 실행을 막으면 *시스템 설정 → 개인정보 보호 및 보안*에서 허용하세요.
- **Linux:** AppImage와 Flatpak에는 앱만 있고 `filmcraft-cli`는 없습니다. deb, rpm, tar.gz 중 하나를 사용하세요. 앱이 AppImage라면 `open_in_filmcraft`가 실행할 수 있도록 `FILMCRAFT_APP`을 설정하세요. GPU가 없는 서버에서는 검증된 환경에 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2`를 설치했습니다.

## 동작 방식

| 구성 요소 | 설명 |
| --- | --- |
| **FilmCraft 엔진** (`filmcraft-cli mcp`) | FilmCraft 자체의 화면 없는 엔진: H.264/HEVC/ProRes/AAC 코덱, 합성기, 효과, Lumetri, 텍스트 엔진, 내보내기. 작업마다 전용 임시 폴더에서 새로 시작합니다. |
| **MCP 서버** (Node.js) | 고수준 도구 11개. 엔진에 명령을 하나씩 보내고(앞 명령이 돌려준 id를 다음 명령에 사용), 경로를 검증하며, 절대 덮어쓰지 않습니다. |
| **실행 중인 앱** (선택) | `open_in_filmcraft` / `run_commands live=true`가 제어 채널(`filmcraft --control 9876`)을 통해 데스크톱 앱을 조작합니다. |

## 도구

| 도구 | 기능 |
| --- | --- |
| `split_video` | 하나 또는 여러 파일을 N초 단위로 프레임 정확도로 분할, 파일마다 폴더 생성(`<이름>_001.mp4`…) |
| `edit_video` | 영상 효과(매개변수와 키프레임), Lumetri 룩, 화면에 입히는 자막, 속도 / 역재생, 오디오 효과, 볼륨, 페이드. 파일 하나 또는 여러 개 |
| `trim_video` | 지정한 시간 구간만 남김(페이드 선택 가능) |
| `concat_videos` | 영상·이미지·오디오를 112가지 트랜지션 중 하나로 연결 |
| `convert_media` | 다시 내보내기: 코덱, 크기, 프레임레이트, 비트레이트, 라우드니스, 프리셋. 오디오 추출 |
| `get_media_info` | 컨테이너, 길이, 코덱, 화면 크기, 프레임레이트, 오디오 |
| `render_frame` | 파일이나 `.fcproj`의 한 프레임을 PNG로(Claude가 이미지를 확인) |
| `list_catalog` | 영상/오디오 효과, 트랜지션, Lumetri 룩, 내보내기 프리셋, 엔진 명령 |
| `run_commands` | 666개 엔진 명령 중 무엇이든 실행, `$items[0]` / `$steps[N].경로` 참조 지원 |
| `open_in_filmcraft` | 프로젝트나 미디어를 FilmCraft 앱에서 열기 |
| `get_filmcraft_status` | 플랫폼, 설치, 버전, 앱 / 제어 포트, 카탈로그 규모 |

## 제공 기능

| | |
| --- | --- |
| **입력** | MP4, MOV, MKV, WebM, AVI, MXF, MPEG-TS, GIF · WAV, MP3, FLAC, AIFF, Ogg, Opus, M4A · PNG, JPEG, TIFF, BMP, WebP, EXR, DPX… |
| **내보내기(렌더링)** | H.264 `.mp4` · ProRes / DNxHR / MJPEG `.mov` · MXF OP1a / OP-Atom · 움직이는 GIF · PNG / TIFF / BMP 스틸 · WAV / AIFF |
| **내보내기 프리셋** | 28개: Match Source(비트레이트 3단계), YouTube / Vimeo 1080p·4K, Social Vertical 1080×1920, ProRes 422 계열, DNxHR, MXF, 이미지 시퀀스, GIF, WAV… |
| **다시 편집 가능한 출력** | `.fcproj`(FilmCraft 프로젝트) · OpenTimelineIO `.otio` · FCPXML(Final Cut / DaVinci) · Premiere / FCP7 `.xml` · `.edl` · AAF(Avid / Pro Tools) |
| **영상 효과** | 130가지: 각종 블러, 선명하게, 흑백, 레벨, ProcAmp, 색조, Lumetri, 모자이크, 포스터화, 노이즈, 글로우, RGB 분리, 렌즈 플레어, 빛 번짐, 카메라 흔들림, 미러, 소용돌이, 웨이브 왜곡, 자르기, 뒤집기, 그림자, grow / shrink / move / spin / wiggle 애니메이션… |
| **컬러 룩** | Lumetri 프리셋 18개: Teal Shadows Warm Skin, Night Exterior, Golden Dusk, Steel Blue, Hard Sun, Faded Print, Silver Retention, Cross Processed, Warm Negative, Neutral / Hard / Cold Mono, Sepia… |
| **오디오 효과** | 58가지: EQ, 필터, 다이내믹스, 리미터, DeNoise, DeHummer, 디에서, 리버브, 딜레이, 피치 시프트, 음성 향상… |
| **트랜지션** | 영상 112가지(디졸브, 암전, 푸시, 슬라이드, 휩, 줌 블러, 글리치, 아이리스, 와이프…) + 오디오 크로스페이드 3가지 |

## 예시

```json
{
  "input_path": "/home/me/clips/beach.mp4",
  "effects": [
    { "effect": "vignette", "params": { "amount": -60 } },
    { "effect": "motion", "keyframes": { "scale": [ { "seconds": 0, "value": 100 }, { "seconds": 3, "value": 115 } ] } }
  ],
  "color_preset": "Golden Dusk",
  "texts": [ { "text": "1일차", "placement": "bottom", "color": "#ffcc00", "stroke_color": "#000000", "size": 110 } ],
  "fade_in": 0.5,
  "preset": "Social Vertical 1080×1920",
  "save_project": true,
  "interchange": ["fcpxml"]
}
```

## 요구 사항

- `filmcraft-cli`가 포함된 **FilmCraft**(**0.2.1**에서 검증), [지원 플랫폼](#지원-플랫폼) 참고
- Node.js 20 이상(`.mcpb`로 설치하면 Claude Desktop에 포함)

## 설치

### Claude Desktop (권장, 모든 플랫폼)

1. [최신 릴리스](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest)에서 `filmcraft-mcp-server.mcpb`를 내려받습니다.
2. 더블 클릭하거나 Claude Desktop → *설정 → 확장 프로그램*으로 끌어다 놓고 **설치**를 누릅니다.
3. 선택: FilmCraft가 표준 위치에 없다면 확장 프로그램 설정에서 폴더나 `filmcraft-cli` 경로를 지정합니다.

### Codex (OpenAI)

**권장 — 마켓플레이스(업데이트 받음):** *플러그인 → 추가 → 마켓플레이스 추가*에서 소스 `jhonsu01/craft-marketplace`, 참조 `main`을 지정한 뒤 **Craft Bridges**에서 **FilmCraft Bridge**를 설치합니다([craft-marketplace](https://github.com/jhonsu01/craft-marketplace)). 마켓플레이스를 새로 고치면 새 버전이 설치됩니다. 또는 zip을 업로드합니다(Codex는 계정에 저장하고 같은 이름의 새 zip은 거부합니다):

1. [최신 릴리스](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest)에서 `filmcraft-mcp-server-<버전>-codex.zip`을 내려받습니다.
2. Codex에서 *플러그인 → 추가 → 새 플러그인*을 열고 zip을 선택한 뒤 **플러그인 추가**를 누릅니다.
3. Codex는 `node`로 서버를 시작하므로 `PATH`에 Node.js ≥ 20이 있어야 합니다. FilmCraft가 표준 위치에 없다면 `FILMCRAFT_DIR` 또는 `FILMCRAFT_CLI`를 시스템 환경 변수로 설정하세요(Codex에는 로컬 플러그인용 설정 화면이 없습니다).

### DeepSeek Harness

1. *Plugins → Add plugin*에서 `github:jhonsu01/craft-marketplace#path:/plugins/filmcraft-mcp-server`를 입력하고 **Install**, 이어서 **Enable now**를 누릅니다.
2. Harness는 자체 MCP 클라이언트와 `node`(`PATH`에 Node.js ≥ 20 필요)로 서버를 시작합니다. 도구는 `mcp__filmcraft__<도구>`로 표시되고, 출력 파일은 Harness에서 열리는 카드로 표시됩니다.
3. Harness는 아직 플러그인을 자동으로 업데이트하지 않습니다. 업데이트하려면 플러그인을 제거한 뒤 같은 주소로 다시 설치하세요.

### Claude Code / 기타 MCP 클라이언트

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

## 설정

| 변수 | 의미 |
| --- | --- |
| `FILMCRAFT_DIR` | FilmCraft 설치 폴더, 그 안의 실행 파일, `.tar.gz` 루트(`bin/` 포함) 또는 `FilmCraft.app`. 기본값: 자동 감지([지원 플랫폼](#지원-플랫폼) 참고) |
| `FILMCRAFT_CLI` | `filmcraft-cli` / `filmcraft-cli.exe` 경로(`FILMCRAFT_DIR`보다 우선) |
| `FILMCRAFT_APP` | 데스크톱 앱이 다른 곳에 있을 때의 경로(예: Linux AppImage) |
| `FILMCRAFT_DATA_DIR` | FilmCraft 데이터 폴더(직접 만든 내보내기 프리셋용) |
| `FILMCRAFT_CONTROL_PORT` | 데스크톱 앱의 제어 포트(기본값 9876) |
| `FILMCRAFT_MCP_TIMEOUT` | 엔진 명령 하나당 최대 초(기본값 3600) |

## 안전

- `overwrite: true`가 아니면 파일을 **절대 덮어쓰지 않으며**, 입력 파일도 바꾸지 않습니다.
- 모든 경로는 절대 경로여야 합니다.
- 모든 작업은 네트워크 없이 로컬에서 실행됩니다. 작업마다 전용 엔진과 임시 폴더를 쓰고 끝나면 삭제합니다.

## 개발

```bash
npm run build       # TypeScript + 단일 파일 번들(dist/bundle.cjs)
npm test            # 단위 테스트(Windows, macOS, Linux 경로 처리)
npm run test:e2e    # 실제 MCP stdio를 통한 22개 엔드투엔드 검사(FilmCraft 내장 합성 데모 영상 사용)
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
npm run pack:codex  # Codex 플러그인 zip
```

Docker에서 Linux 검증(먼저 `filmcraft-<버전>-linux-x86_64.tar.gz`를 풀어 두세요):

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/filmcraft-0.2.1-linux-x86_64:/opt/filmcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 && node scripts/e2e.mjs"
```

## 라이선스

Apache-2.0. FilmCraft의 저작권은 그 저자(Storytold)에게 있으며 MIT / Apache-2.0 이중 라이선스입니다.
이 프로젝트는 FilmCraft 및 Storytold와 관련이 없으며 그들의 승인을 받지 않았습니다. Adobe Premiere Pro는 Adobe의 상표입니다.
