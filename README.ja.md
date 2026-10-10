<p align="center"><img src="icon.png" width="120" alt="FilmCraft Bridge のアイコン"></p>

<h1 align="center">FilmCraft MCP Server</h1>

<p align="center">
  <a href="README.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.fr.md">Français</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a> · <b>日本語</b> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  お使いのパソコンにインストールした <b>FilmCraft</b> で Claude に動画を編集させましょう —— <b>Windows・macOS・Linux</b> 対応：<br>
  分割、トリミング、エフェクト、カラールック、テロップ、速度、音声、トランジション、書き出し、そして再編集できるタイムライン。
</p>

---

## なぜ

[FilmCraft](https://github.com/storytold/filmcraft) は Rust で書かれた、Premiere クラスのオープンソース動画編集ソフトです。すべての操作がエンジンのコマンドであり、画面なしで動く CLI（`filmcraft-cli`）も付属しています。この [Model Context Protocol](https://modelcontextprotocol.io) サーバーは、そのエンジンを Claude 向けの **「ファイルを渡してファイルを受け取る」ツール** に変えます。たとえば次のように頼めます。

> *「`D:\clips` の動画をすべて 2 秒ずつに分割して、動画ごとにフォルダーを分けて」*
> *「`~/trip/a.mp4` にビネット、Golden Dusk のルック、下に『1 日目』のタイトルを入れて」*
> *「この 3 カットをクロスディゾルブでつないで、YouTube 1080p 用に書き出して」*
> *「この編集を FilmCraft プロジェクトと DaVinci 用の FCPXML でちょうだい」*

[audacity-mcp-server](https://github.com/jhonsu01/audacity-mcp-server) に着想を得ています。

## 対応プラットフォーム

| OS | インストールする FilmCraft パッケージ | サーバーが自動で探す場所（設定不要） | 状況 |
| --- | --- | --- | --- |
| **Windows** 10/11（x64、x86） | MSI またはポータブル zip | `C:\Program Files\FilmCraft`、`%LOCALAPPDATA%\Programs\FilmCraft`、`PATH` | ✅ 検証済み（Windows 11） |
| **Linux**（x86_64、aarch64、glibc ≥ 2.35） | `.deb`、`.rpm` または `.tar.gz` | `/usr/bin`、`/usr/local/bin`、`/opt/filmcraft/bin`、`~/.local/bin`、`PATH` | ✅ 検証済み（Debian 12、画面なし、e2e 21/21） |
| **macOS** 11 以降（Apple シリコン・Intel） | `.dmg`（アプリ）**と** `filmcraft-cli-<バージョン>-macos-universal.zip` | `/Applications/FilmCraft.app`、`/usr/local/bin`、`/opt/homebrew/bin`、`~/.local/bin`、`~/bin`、`PATH` | 🟡 対応済み、Mac 実機では未検証 |

ダウンロード：[FilmCraft のリリース](https://github.com/storytold/filmcraft/releases)。それ以外の場所に置いた場合は `FILMCRAFT_DIR`（フォルダー、`.tar.gz` のルート、または `FilmCraft.app`）か `FILMCRAFT_CLI` を設定してください。

- **macOS：** DMG にはアプリしか入っていません。別配布の `filmcraft-cli` の zip を展開し、`filmcraft-cli` を `/usr/local/bin` に移動してください（または `FILMCRAFT_CLI` でその場所を指定）。初回起動が macOS にブロックされたら、*システム設定 → プライバシーとセキュリティ* で許可してください。
- **Linux：** AppImage と Flatpak にはアプリのみで `filmcraft-cli` は含まれません。deb、rpm、tar.gz のいずれかを使ってください。アプリが AppImage の場合は、`open_in_filmcraft` が起動できるよう `FILMCRAFT_APP` を設定してください。GPU のないサーバーでは、検証済み環境で `libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2` を入れました。

## しくみ

| 構成要素 | 内容 |
| --- | --- |
| **FilmCraft エンジン**（`filmcraft-cli mcp`） | FilmCraft 自身の画面なしエンジン：H.264/HEVC/ProRes/AAC コーデック、合成、エフェクト、Lumetri、テキストエンジン、書き出し機能。ジョブごとに専用の一時フォルダーで新しく起動します。 |
| **MCP サーバー**（Node.js） | 11 個の高レベルツール。エンジンへコマンドを 1 つずつ送り（あるコマンドが返した id を次に使う）、パスを検証し、上書きは一切しません。 |
| **ライブアプリ**（任意） | `open_in_filmcraft` / `run_commands live=true` で、制御チャネル（`filmcraft --control 9876`）経由でデスクトップアプリを操作します。 |

## ツール

| ツール | 機能 |
| --- | --- |
| `split_video` | 1 つまたは複数のファイルを N 秒ずつ、フレーム単位で正確に分割。ファイルごとにフォルダーを作成（`<名前>_001.mp4`…） |
| `edit_video` | 動画エフェクト（パラメーターとキーフレーム）、Lumetri ルック、焼き込みテロップ、速度 / 逆再生、音声エフェクト、音量、フェード。1 つでも複数でも可 |
| `trim_video` | 指定した時間範囲だけを残す（フェードも可） |
| `concat_videos` | 動画・静止画・音声を 112 種類のトランジションのいずれかでつなぐ |
| `convert_media` | 再書き出し：コーデック、サイズ、フレームレート、ビットレート、ラウドネス、プリセット。音声の抽出も可 |
| `get_media_info` | コンテナ、長さ、コーデック、フレームサイズ、フレームレート、音声 |
| `render_frame` | ファイルまたは `.fcproj` の 1 フレームを PNG に（Claude が画像を確認できます） |
| `list_catalog` | 動画・音声エフェクト、トランジション、Lumetri ルック、書き出しプリセット、エンジンコマンド |
| `run_commands` | 666 個のエンジンコマンドのどれでも実行。`$items[0]` / `$steps[N].パス` で参照可能 |
| `open_in_filmcraft` | プロジェクトや素材を FilmCraft アプリで開く |
| `get_filmcraft_status` | プラットフォーム、インストール、バージョン、アプリ / 制御ポート、カタログ規模 |

## できること

| | |
| --- | --- |
| **入力** | MP4、MOV、MKV、WebM、AVI、MXF、MPEG-TS、GIF · WAV、MP3、FLAC、AIFF、Ogg、Opus、M4A · PNG、JPEG、TIFF、BMP、WebP、EXR、DPX… |
| **書き出し（レンダリング）** | H.264 `.mp4` · ProRes / DNxHR / MJPEG `.mov` · MXF OP1a / OP-Atom · アニメーション GIF · PNG / TIFF / BMP 静止画 · WAV / AIFF |
| **書き出しプリセット** | 28 種類：Match Source（3 段階のビットレート）、YouTube / Vimeo 1080p・4K、Social Vertical 1080×1920、ProRes 422 系、DNxHR、MXF、連番画像、GIF、WAV… |
| **再編集できる出力** | `.fcproj`（FilmCraft プロジェクト）· OpenTimelineIO `.otio` · FCPXML（Final Cut / DaVinci）· Premiere / FCP7 の `.xml` · `.edl` · AAF（Avid / Pro Tools） |
| **動画エフェクト** | 130 種類：各種ブラー、シャープ、モノクロ、レベル補正、ProcAmp、色かぶり、Lumetri、モザイク、ポスタリゼーション、ノイズ、グロー、RGB 分離、レンズフレア、光漏れ、手ぶれ、ミラー、渦巻き、波形ワープ、クロップ、反転、ドロップシャドウ、grow / shrink / move / spin / wiggle アニメーション… |
| **カラールック** | Lumetri プリセット 18 種類：Teal Shadows Warm Skin、Night Exterior、Golden Dusk、Steel Blue、Hard Sun、Faded Print、Silver Retention、Cross Processed、Warm Negative、Neutral / Hard / Cold Mono、Sepia… |
| **音声エフェクト** | 58 種類：EQ、フィルター、ダイナミクス、リミッター、DeNoise、DeHummer、ディエッサー、リバーブ、ディレイ、ピッチシフト、音声強調… |
| **トランジション** | 動画 112 種類（ディゾルブ、暗転、プッシュ、スライド、ホイップ、ズームブラー、グリッチ、アイリス、ワイプ…）＋ 音声クロスフェード 3 種類 |

## 例

```json
{
  "input_path": "/home/me/clips/beach.mp4",
  "effects": [
    { "effect": "vignette", "params": { "amount": -60 } },
    { "effect": "motion", "keyframes": { "scale": [ { "seconds": 0, "value": 100 }, { "seconds": 3, "value": 115 } ] } }
  ],
  "color_preset": "Golden Dusk",
  "texts": [ { "text": "1 日目", "placement": "bottom", "color": "#ffcc00", "stroke_color": "#000000", "size": 110 } ],
  "fade_in": 0.5,
  "preset": "Social Vertical 1080×1920",
  "save_project": true,
  "interchange": ["fcpxml"]
}
```

## 必要なもの

- `filmcraft-cli` 付きの **FilmCraft**（**0.2.1** で検証）。[対応プラットフォーム](#対応プラットフォーム) を参照
- Node.js 20 以上（`.mcpb` でインストールする場合は Claude Desktop に同梱）

## インストール

### Claude Desktop（推奨、全プラットフォーム）

1. [最新リリース](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest) から `filmcraft-mcp-server.mcpb` をダウンロードします。
2. ダブルクリック（または Claude Desktop → *設定 → 拡張機能* にドラッグ）して **インストール** をクリックします。
3. 任意：FilmCraft が標準の場所にない場合は、拡張機能の設定でフォルダーか `filmcraft-cli` のパスを指定します。

### Codex（OpenAI）

**推奨 — マーケットプレイス（更新を受け取れます）：** *プラグイン → 追加 → マーケットプレイスを追加* で、ソースに `jhonsu01/craft-marketplace`、参照に `main` を指定し、**Craft Bridges** から **FilmCraft Bridge** をインストールします（[craft-marketplace](https://github.com/jhonsu01/craft-marketplace)）。新しいバージョンはマーケットプレイスの更新で届きます。または zip をアップロードします（Codex はアカウントに保存し、同じ名前の新しい zip を拒否します）：

1. [最新リリース](https://github.com/jhonsu01/filmcraft-mcp-server/releases/latest)から `filmcraft-mcp-server-<バージョン>-codex.zip` をダウンロードします。
2. Codex で *プラグイン → 追加 → 新しいプラグイン* を開き、zip を選んで **プラグインを追加** をクリックします。
3. Codex はサーバーを `node` で起動するため、`PATH` に Node.js ≥ 20 が必要です。FilmCraft が標準の場所にない場合は、`FILMCRAFT_DIR` または `FILMCRAFT_CLI` をシステムの環境変数として設定してください（Codex にはローカルプラグイン用の設定画面がありません）。

### Claude Code / その他の MCP クライアント

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

## 設定

| 変数 | 意味 |
| --- | --- |
| `FILMCRAFT_DIR` | FilmCraft のフォルダー、その実行ファイル、`.tar.gz` のルート（`bin/` を含む）、または `FilmCraft.app`。既定：自動検出（[対応プラットフォーム](#対応プラットフォーム) を参照） |
| `FILMCRAFT_CLI` | `filmcraft-cli` / `filmcraft-cli.exe` のパス（`FILMCRAFT_DIR` より優先） |
| `FILMCRAFT_APP` | デスクトップアプリが別の場所にある場合のパス（例：Linux の AppImage） |
| `FILMCRAFT_DATA_DIR` | FilmCraft のデータフォルダー（独自の書き出しプリセット用） |
| `FILMCRAFT_CONTROL_PORT` | デスクトップアプリの制御ポート（既定 9876） |
| `FILMCRAFT_MCP_TIMEOUT` | エンジンコマンド 1 つあたりの最大秒数（既定 3600） |

## 安全性

- `overwrite: true` を指定しない限り、ファイルは**決して上書きされません**。入力ファイルも変更しません。
- パスはすべて絶対パスで指定します。
- すべてローカルで動作し、ネットワークには接続しません。ジョブごとに専用エンジンと一時フォルダーを使い、終了後に削除します。

## 開発

```bash
npm run build       # TypeScript + 単一ファイルバンドル（dist/bundle.cjs）
npm test            # 単体テスト（Windows・macOS・Linux のパス処理）
npm run test:e2e    # 実際の MCP stdio を通した 21 項目のエンドツーエンド検証（FilmCraft 付属の合成デモ映像を使用）
npm run pack:mcpb   # filmcraft-mcp-server.mcpb
npm run pack:codex  # Codex 用プラグイン zip
```

Docker での Linux 検証（先に `filmcraft-<バージョン>-linux-x86_64.tar.gz` を展開）：

```bash
docker run --rm -v "$PWD:/work:ro" -v "/path/to/filmcraft-0.2.1-linux-x86_64:/opt/filmcraft:ro" -w /work node:22-bookworm bash -c "apt-get update && apt-get install -y libxkbcommon0 libvulkan1 libegl1 mesa-vulkan-drivers libasound2 && node scripts/e2e.mjs"
```

## ライセンス

Apache-2.0。FilmCraft の著作権はその作者（Storytold）にあり、MIT / Apache-2.0 のデュアルライセンスです。
本プロジェクトは FilmCraft および Storytold とは無関係で、承認も受けていません。Adobe Premiere Pro は Adobe の商標です。
