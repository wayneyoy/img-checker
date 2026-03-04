# img-checker · 图片取证检查器

**English** | [中文](#中文说明)

A pure-frontend image forensics tool. Drop an image, get a full 6-dimension analysis report instantly — no server, no upload, no dependencies.

**[→ Live Demo](https://static.qiantucdn.com/share/imagedata/index.html)** &nbsp;·&nbsp; Double-click `index.html` to use locally

---

## Features

| Dimension | What it checks |
|---|---|
| 🔍 Format Forensics | Magic bytes, MIME type, SHA-256, encoding process, extension mismatch detection |
| 📐 Resize & Compress | Center-crop to presets, compress to target file size, combined one-click operation |
| 🤖 AI Detection | Heuristic signals: missing EXIF, UUID filename, AI resolutions, CreatorTool keywords |
| ⚠️ Brand/IP Risk | Keyword scan for 100+ brands & cartoon IPs across filename and metadata |
| 🖼 Visual Quality | Resolution, aspect ratio, color mode, DPI, JPEG quality estimate |
| 🗂 Origin Tracing | Full EXIF/IPTC/XMP, GPS reverse geocode, camera info, copyright fields |

**Supports**: JPEG · PNG · WebP · GIF · HEIC/HEIF (with fallback via heic2any)

---

## Usage

1. Open [Live Demo](https://static.qiantucdn.com/share/imagedata/index.html), or clone and double-click `index.html`
2. Drag & drop an image (or click to select) — supports multiple files
3. Browse the 6-dimension report
4. Use the built-in tools to resize, compress, or convert format
5. Copy image to clipboard for direct paste into AI chat tools (ChatGPT, Claude, etc.)

No build step. No npm. No API keys. Works entirely in your browser.

---

## Size Presets

Three built-in presets for common banner/feed specs (with recommended target file size):

| Preset | Size | Target |
|---|---|---|
| Banner | 700×332px | ≤150kB |
| Feed Landscape | 320×240px | ≤40kB |
| Feed Square | 720×720px | ≤200kB |

Plus standard social presets: Xiaohongshu · Douyin · Weibo · WeChat · etc.

**To customize**, edit `SIZE_PRESETS` at the top of `app.js`:

```js
const SIZE_PRESETS = [
  { label: 'Your Preset', w: 800, h: 600, note: '4:3', targetKB: 100 },
  // ...
];
```

---

## Tech Stack

- Vanilla HTML + CSS + JavaScript (ES2020) — no framework
- [exifr](https://github.com/MikeKovarik/exifr) — EXIF/IPTC/XMP parsing
- [heic2any](https://github.com/alexcorvi/heic2any) — HEIC decoding fallback
- Web Crypto API — SHA-256 fingerprinting
- Canvas API — format conversion, compression, center-crop resize

---

## License

MIT © 2026

---

---

## 中文说明

纯前端图片取证工具。拖入图片，即时获得六维度分析报告——无服务器、无上传、无需安装。

**[→ 在线演示](https://static.qiantucdn.com/share/imagedata/index.html)** &nbsp;·&nbsp; 或下载后双击 `index.html` 本地使用

---

## 功能介绍

| 维度 | 检测内容 |
|---|---|
| 🔍 格式取证 | 魔数检测、MIME 类型、SHA-256 指纹、编码方式、扩展名伪装识别 |
| 📐 尺寸与压缩 | 居中裁切到常用规格、压缩到目标体积、一键裁切压缩 |
| 🤖 AI 生成检测 | 启发式信号：无 EXIF、UUID 文件名、AI 常见分辨率、生成工具关键词 |
| ⚠️ 品牌/IP 风险 | 在文件名及元数据中扫描 100+ 知名品牌和卡通 IP 关键词 |
| 🖼 显示质量 | 分辨率、宽高比、色彩模式、DPI、JPEG 质量估算 |
| 🗂 来源追溯 | 完整 EXIF/IPTC/XMP、GPS 反查地名、相机信息、版权字段 |

**支持格式**：JPEG · PNG · WebP · GIF · HEIC/HEIF（含 heic2any 兜底解码）

---

## 使用方法

1. 打开[在线演示](https://static.qiantucdn.com/share/imagedata/index.html)，或下载后双击 `index.html`
2. 拖拽图片进入（或点击选择），支持同时分析多张
3. 查看六维度取证报告
4. 使用内置工具裁切/压缩/转换格式
5. 点击「复制图片」可直接粘贴到 ChatGPT、Claude 等 AI 对话框

无需构建，无需 npm，无需 API Key，完全在浏览器本地运行。

---

## 自定义尺寸预设

修改 `app.js` 顶部的 `SIZE_PRESETS` 数组即可：

```js
const SIZE_PRESETS = [
  { label: '自定义规格', w: 800, h: 600, note: '4:3', targetKB: 100 },
  // ...
];
```

`targetKB` 为可选字段，填写后「裁切压缩」按钮会自动使用该目标体积。
