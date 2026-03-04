# img-checker · 图片取证检查器

A pure-frontend image forensics tool. Drop an image, get a full 6-dimension analysis report instantly — no server, no upload, no dependencies.

纯前端图片取证工具。拖入图片，即时获得六维度分析报告——无服务器、无上传、无需安装。

**[→ Live Demo](https://your-domain.com/img-checker)** &nbsp;|&nbsp; Double-click `index.html` to use locally / 双击 `index.html` 本地使用

---

## Features · 功能

| Dimension | What it checks |
|---|---|
| 🔍 Format Forensics | Magic bytes, MIME type, SHA-256, encoding, extension mismatch |
| 📐 Resize & Compress | Center-crop to presets, compress to target file size |
| 🤖 AI Detection | Heuristic signals: missing EXIF, UUID filename, AI resolutions, CreatorTool |
| ⚠️ Brand/IP Risk | Keyword scan for 100+ brands & cartoon IPs across metadata |
| 🖼 Visual Quality | Resolution, color mode, DPI, JPEG quality estimate |
| 🗂 Origin Tracing | Full EXIF/IPTC/XMP, GPS reverse geocode, copyright fields |

**Supports**: JPEG · PNG · WebP · GIF · HEIC/HEIF (with fallback via heic2any)

---

## Presets · 尺寸预设

Three built-in presets for common banner/feed requirements (with target file size):

```
千图Banner      700×332px  ≤150kB
mini推荐横图    320×240px  ≤40kB
mini推荐方图    720×720px  ≤200kB
```

Plus standard social presets: 小红书 / 抖音 / 微博 / 微信 / etc.

**To customize**, edit `SIZE_PRESETS` at the top of `app.js`:

```js
const SIZE_PRESETS = [
  { label: 'Your Preset', w: 800, h: 600, note: '4:3', targetKB: 100 },
  // ...
];
```

---

## Usage · 使用方法

1. Clone or download → open `index.html` in Chrome / Safari / Edge
2. Drag & drop an image, or click to select
3. View the analysis · use resize/compress tools · copy image to clipboard

No build step. No npm. No API keys.

---

## Tech · 技术栈

- Vanilla HTML + CSS + JavaScript (ES2020)
- [exifr](https://github.com/MikeKovarik/exifr) — EXIF parsing
- [heic2any](https://github.com/alexcorvi/heic2any) — HEIC decoding fallback
- Web Crypto API — SHA-256
- Canvas API — format conversion, compression, center-crop resize

---

## License

MIT
