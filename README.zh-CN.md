<p align="center"><img src="icon.png" width="120" alt="FilmCraft Bridge 图标"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <b>简体中文</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  让 Claude 使用你电脑上安装的 <b>FilmCraft</b> 剪辑视频 —— 支持 <b>Windows、macOS 和 Linux</b>：<br>
  分段、裁剪、特效、调色风格、字幕标题、变速、音频、转场、导出，以及可再次编辑的时间线。
</p>

---

## 为什么

[FilmCraft](https://github.com/storytold/filmcraft) 是一款用 Rust 编写、对标 Premiere 的开源视频编辑器。它的每个操作都是一条引擎命令，并自带无界面的命令行工具（`filmcraft-cli`）。这个 [Model Context Protocol](https://modelcontextprotocol.io) 服务器把该引擎变成 Claude 可调用的 **"文件进、文件出" 工具**，例如你可以说：

> *"把 `D:\clips` 里的每个视频切成 2 秒一段，每个视频一个文件夹。"*
> *"给 `~/trip/a.mp4` 加暗角、Golden Dusk 调色，并在底部加上标题「第 1 天」。"*
> *"把这三个镜头用交叉溶解连起来，导出为 YouTube 1080p。"*
> *"把这次剪辑导出为 FilmCraft 工程，再给 DaVinci 导出一份 FCPXML。"*

灵感来自 [audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server)。

## 平台

| 系统 | 需要安装的 FilmCraft 包 | 服务器会自动查找的位置（无需配置） | 状态 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86） | MSI 或便携版 zip | `C:\Program Files\FilmCraft`、`%LOCALAPPDATA%\Programs\FilmCraft`、`PATH` | ✅ 已验证（Windows 11） |
| **Linux**（x86_64、aarch64，glibc ≥ 2.35） | `.deb`、`.rpm` 或 `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/filmcraft/bin`、`~/.local/bin`、`PATH` | ✅ 已验证（Debian 12，无界面，e2e 21/21） |
| **macOS** 11+（Apple 芯片和 Intel） | `.dmg`（应用）**以及** `filmcraft-cli-<版本>-macos-universal.zip` | `/Applications/FilmCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 已支持，尚未在 Mac 上实测 |

下载：[FilmCraft 发布页](https://github.com/storytold/filmcraft/releases)。若安装在其他位置，请设置 `FILMCRAFT_DIR`（文件夹、`.tar.gz` 解压根目录或 `FilmCraft.app`）或 `FILMCRAFT_CLI`。

- **macOS：** DMG 里只有应用本身。请解压单独提供的 `filmcraft-cli` zip，把 `filmcraft-cli` 移到 `/usr/local/bin`（或用 `FILMCRAFT_CLI` 指向它）。如果 macOS 阻止首次运行，请在 *系统设置 → 隐私与安全性* 中允许。
- **Linux：** AppImage 和 Flatpak 只包含应用，不含 `filmcraft-cli`，请使用 deb、rpm 或 tar.gz。若应用是 AppImage，请设置 `FILMCRAFT_APP`，以便 `open_in_filmcraft` 能启动它。在没有 GPU 的服务器上，经过验证的环境安装了 `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2`。

## 工作原理

| 组成 | 说明 |
| --- | --- |
| **FilmCraft 引擎**（`filmcraft-cli mcp`） | FilmCraft 自己的无界面引擎：H.264/HEVC/ProRes/AAC 编解码器、合成器、特效、Lumetri、文字引擎和导出器。每个任务都在独立的临时文件夹中重新启动。 |
| **MCP 服务器**（Node.js） | 11 个高层工具。逐条向引擎发送命令（上一条命令返回的 id 用于下一条），校验路径，从不覆盖文件。 |
| **实时应用**（可选） | `open_in_filmcraft` / `run_commands live=true` 通过控制通道（`filmcraft --control 9876`）操作桌面应用。 |

## 工具

| 工具 | 功能 |
| --- | --- |
| `split_video` | 将一个或多个文件按 N 秒逐帧精确切段，每个文件一个文件夹（`<名称>_001.mp4`…） |
| `edit_video` | 视频特效（参数与关键帧）、Lumetri 调色、烧录字幕标题、变速 / 倒放、音频特效、音量、淡入淡出；支持单个或多个文件 |
| `trim_video` | 保留一段时间范围，可选淡入淡出 |
| `concat_videos` | 用 112 种转场之一连接视频、图片和音频 |
| `convert_media` | 重新导出：编码、尺寸、帧率、码率、响度、预设；提取音频 |
| `get_media_info` | 容器、时长、编码、画面尺寸、帧率、音频 |
| `render_frame` | 将文件或 `.fcproj` 的某一帧渲染为 PNG（Claude 可以看到） |
| `list_catalog` | 视频/音频特效、转场、Lumetri 风格、导出预设、引擎命令 |
| `run_commands` | 666 条引擎命令中的任意一条，支持 `$items[0]` / `$steps[N].路径` 引用 |
| `open_in_filmcraft` | 在 FilmCraft 应用中打开工程或素材 |
| `get_filmcraft_status` | 平台、安装、版本、应用 / 控制端口、目录规模 |

## 能力一览

| | |
| --- | --- |
| **输入** | MP4、MOV、MKV、WebM、AVI、MXF、MPEG-TS、GIF · WAV、MP3、FLAC、AIFF、Ogg、Opus、M4A · PNG、JPEG、TIFF、BMP、WebP、EXR、DPX… |
| **导出（渲染）** | H.264 `.mp4` · ProRes / DNxHR / MJPEG `.mov` · MXF OP1a / OP-Atom · GIF 动图 · PNG / TIFF / BMP 静帧 · WAV / AIFF |
| **导出预设** | 28 个：Match Source（3 种码率）、YouTube / Vimeo 1080p 与 4K、Social Vertical 1080×1920、ProRes 422 系列、DNxHR、MXF、图像序列、GIF、WAV… |
| **可编辑输出** | `.fcproj`（FilmCraft 工程）· OpenTimelineIO `.otio` · FCPXML（Final Cut / DaVinci）· Premiere / FCP7 `.xml` · `.edl` · AAF（Avid / Pro Tools） |
| **视频特效** | 130 种：各类模糊、锐化、黑白、色阶、ProcAmp、着色、Lumetri、马赛克、色调分离、噪点、辉光、RGB 分离、镜头光晕、漏光、镜头抖动、镜像、旋转扭曲、波浪变形、裁剪、翻转、投影，以及 grow / shrink / move / spin / wiggle 动画… |
| **调色风格** | 18 个 Lumetri 预设：Teal Shadows Warm Skin、Night Exterior、Golden Dusk、Steel Blue、Hard Sun、Faded Print、Silver Retention、Cross Processed、Warm Negative、Neutral / Hard / Cold Mono、Sepia… |
| **音频特效** | 58 种：均衡器、滤波器、动态处理、限幅器、DeNoise、DeHummer、齿音消除、混响、延迟、变调、人声增强… |
| **转场** | 112 种视频转场（溶解、黑场过渡、推、滑、甩、缩放模糊、故障、光圈、擦除…）+ 3 种音频交叉淡化 |

## 示例

```json
{
  "input_path": "/home/me/clips/beach.mp4",
  "effects": [
    { "effect": "vignette", "params": { "amount": -60 } },
    { "effect": "motion", "keyframes": { "scale": [ { "seconds": 0, "value": 100 }, { "seconds": 3, "value": 115 } ] } }
  ],
  "color_preset": "Golden Dusk",
  "texts": [ { "text": "第 1 天", "placement": "bottom", "color": "#ffcc00", "stroke_color": "#000000", "size": 110 } ],
  "fade_in": 0.5,
  "preset": "Social Vertical 1080×1920",
  "save_project": true,
  "interchange": ["fcpxml"]
}
```

## 要求

- 带有 `filmcraft-cli` 的 **FilmCraft**（已在 **0.2.1** 上测试），见 [平台](#平台)
- Node.js ≥ 20（通过 `.mcpb` 安装时 Claude Desktop 已自带）

## 安装

### Claude Desktop（推荐，所有平台）

1. 从 [最新发布](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest) 下载 `filmcraft-mcp-server.mcpb`。
2. 双击它（或拖到 Claude Desktop → *设置 → 扩展*），然后点击 **安装**。
3. 可选：如果 FilmCraft 不在标准位置，请在扩展设置中填写它的文件夹或 `filmcraft-cli` 的路径。

### Codex（OpenAI）

**推荐 —— 插件市场（可获得更新）：** *插件 → 添加 → 添加插件市场*，来源 `jhonsu01/craft-marketplace`，引用 `main`，然后从 **Craft Bridges** 安装 **FilmCraft Bridge**（[craft-marketplace](https://github.com/jhonsu01/craft-marketplace)）。刷新插件市场即可获得新版本。或者上传 zip（Codex 会把它保存在你的账户中，并拒绝同名的新版 zip）：

1. 从[最新发布](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest)下载 `filmcraft-mcp-server-<版本>-codex.zip`。
2. 在 Codex 中：*插件 → 添加 → 新插件*，选择该 zip，然后点击 **添加插件**。
3. Codex 用 `node` 启动服务器，因此 `PATH` 中必须有 Node.js ≥ 20。如果 FilmCraft 不在标准位置，请把 `FILMCRAFT_DIR` 或 `FILMCRAFT_CLI` 设为系统环境变量（Codex 没有本地插件的设置表单）。

### Claude Code / 其他 MCP 客户端

```bash
git clone https://github.com/jhonsu01/filmcraft-mcp-server.git
cd filmcraft-mcp-server
npm install
npm run build
```

Windows：

```bash
claude mcp add filmcraft -- node "%CD%\dist\bundle.cjs"
```

macOS / Linux：

```bash
claude mcp add filmcraft -- node "$PWD/dist/bundle.cjs"
```

## 配置

| 变量 | 含义 |
| --- | --- |
| `FILMCRAFT_DIR` | FilmCraft 安装文件夹、其中某个可执行文件、`.tar.gz` 解压根目录（含 `bin/`）或 `FilmCraft.app`。默认：自动检测（见 [平台](#平台)） |
| `FILMCRAFT_CLI` | `filmcraft-cli` / `filmcraft-cli.exe` 的路径（优先于 `FILMCRAFT_DIR`） |
| `FILMCRAFT_APP` | 桌面应用在其他位置时的路径（例如 Linux 的 AppImage） |
| `FILMCRAFT_DATA_DIR` | FilmCraft 数据文件夹，用于你自己的导出预设 |
| `FILMCRAFT_CONTROL_PORT` | 桌面应用的控制端口（默认 9876） |
| `FILMCRAFT_MCP_TIMEOUT` | 每条引擎命令的最长秒数（默认 3600） |

## 安全

- 除非设置 `overwrite: true`，否则**绝不覆盖**文件；输入文件永远不会被修改。
- 所有路径必须是绝对路径。
- 一切都在本地运行，不访问网络。每个任务使用独立引擎和临时文件夹，结束后自动删除。

## 开发

```bash
npm run build       # TypeScript + 单文件打包（dist/bundle.cjs）
npm test            # 单元测试（Windows、macOS、Linux 路径逻辑）
npm run test:e2e    # 通过真实 MCP stdio 的 21 项端到端检查（使用 FilmCraft 自带的合成演示素材）
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
npm run pack:codex  # Codex 插件 zip
```

在 Docker 中测试 Linux（先解压 `filmcraft-<版本>-linux-x86_64.tar.gz`）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/filmcraft-0.2.1-linux-x86_64:/opt/filmcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 && node scripts/e2e.mjs"
```

## 许可证

Apache-2.0。FilmCraft 版权归其作者（Storytold）所有，采用 MIT / Apache-2.0 双许可。
本项目与 FilmCraft 和 Storytold 无关，也未获得其认可。Adobe Premiere Pro 是 Adobe 的商标。
