# img-checker · 图片取证检查器

[中文](#中文说明) | **English**

六维度图片取证工具，提供两种使用方式：

| | 网页 Demo 版 | AI Agent Skill 版 |
|---|---|---|
| **使用方式** | 浏览器拖入图片 | 与 AI Agent 对话 |
| **AI 生成检测** | 元数据启发式判断 | 视觉 AI + 元数据双层打分 |
| **品牌/IP 检测** | 元数据关键词扫描 | 视觉识别，覆盖 15 大公司 IP 库 |
| **输出形式** | 浏览器交互报告 | 结构化 Markdown，结论前置 |
| **无需服务器** | ✅ | ✅（运行在 Cursor 本地）|

**[→ 在线演示](https://static.qiantucdn.com/share/imagedata/index.html)** &nbsp;·&nbsp; 或下载后双击 `index.html` 本地使用

---

## 中文说明

### 网页 Demo 版 — 纯前端工具

| 维度 | 检测内容 |
|---|---|
| 🔍 格式取证 | 魔数检测、MIME 类型、SHA-256 指纹、编码方式、扩展名伪装识别 |
| 📐 尺寸与压缩 | 居中裁切到常用规格、压缩到目标体积、一键裁切压缩 |
| 🤖 AI 生成检测 | 启发式：无 EXIF、UUID 文件名、AI 常见分辨率、生成工具关键词 |
| ⚠️ 品牌/IP 风险 | 在文件名及元数据中扫描 100+ 知名品牌和卡通 IP 关键词 |
| 🖼 显示质量 | 分辨率、宽高比、色彩模式、DPI、JPEG 质量估算 |
| 🗂 来源追溯 | 完整 EXIF/IPTC/XMP、GPS 反查地名、相机信息、版权字段 |

**支持格式**：JPEG · PNG · WebP · GIF · HEIC/HEIF（含 heic2any 兜底解码）

**网页版局限性：**
- AI 生成检测仅依赖元数据启发式，**无法读取图片像素内容**
- 品牌/IP 风险仅为关键词扫描，**无法视觉识别**画面中的 Logo 或卡通形象

#### 使用方法

1. 打开[在线演示](https://static.qiantucdn.com/share/imagedata/index.html)，或下载后双击 `index.html`
2. 拖拽图片进入（或点击选择），支持同时分析多张
3. 查看六维度取证报告
4. 使用内置工具裁切 / 压缩 / 转换格式
5. 点击「复制图片」可直接粘贴到 ChatGPT、Claude 等 AI 对话框

无需构建，无需 npm，无需 API Key，完全在浏览器本地运行。

---

### AI Agent Skill 版 — 视觉增强深度检测

`skill/` 目录包含一个 [Cursor](https://cursor.sh) Agent Skill，对两个核心维度进行视觉级增强：

**🤖 AI 生成检测（升级版）**

调用 AI Agent 原生视觉能力读取图片像素，对照 `AI-DETECTION-GUIDE.md` 视觉标准库逐项打分：

| 信号类型 | 分值 | 代表项 |
|---|---|---|
| 决定性证据 | 5 分 | 手部解剖异常、文字乱码、CreatorTool 含 AI 工具名 |
| 强支撑 | 3 分 | 皮肤过平、背景违反力学、边缘融化 |
| 辅助信号 | 2 分 | 无 EXIF、布料纹理异常 |
| 弱信号 | 1 分 | 眼睛玻璃感、AI 常见宽高比 |

阈值：0–2分 🟢 低可能性 · 3–5分 🟡 疑似 · ≥6分 🔴 高可能性

**⚠️ 品牌/IP 风险检测（升级版）**

视觉识别画面内容，对照 `BRAND-IP-LIBRARY.md` 涵盖 15 大公司集团：

迪士尼 · 漫威 · 华纳/DC · 三丽鸥 · 泡泡玛特 · 任天堂 · 宝可梦 · 日本动漫（火影/海贼王/吉卜力…）· 韩国 IP · 中国 IP · 奢侈品牌 · 运动品牌 · 科技品牌 · 餐饮品牌 · 受保护建筑

| 命中类型 | 分值 |
|---|---|
| 完整卡通角色（米老鼠、皮卡丘、Hello Kitty…）| 5 分 |
| 核心 Logo（Nike Swoosh、Apple、LV 字母…）| 4 分 |
| 品牌经典图案（Burberry 格纹、Chanel 菱格…）| 3 分 |
| 品牌特征元素局部出现 | 2 分 |
| 风格相近，来源不确定 | 1 分 |

阈值：0分 🟢 无风险 · 1–3分 🟡 中风险 · ≥4分 🔴 高风险

#### 报告结构（结论前置）

```
⚡ 综合判定（先看这里）
  AI 生成可能性    [得分 + 一句话理由]
  品牌/IP 版权风险  [得分 + 一句话理由]
  格式安全性       [正常 / 扩展名伪装]
  → 最终建议

详细检测报告（往下翻）
  一、AI 生成检测（逐项打分明细）
  二、品牌/IP 风险（命中清单）
  三、格式取证
  四、显示质量
  五、来源追溯
  六、平台适配
```

#### Skill 文件

```
skill/
├── SKILL.md               # 执行流程与输出规范
├── AI-DETECTION-GUIDE.md  # 视觉 AI 生成痕迹打分标准库
└── BRAND-IP-LIBRARY.md    # 品牌/IP 视觉识别库（15 大公司集团）
```

使用方法：在 [Cursor](https://cursor.sh) 中安装后，直接对 Agent 说"帮我检测这张图"即可。

---

### 自定义尺寸预设

修改 `app.js` 顶部的 `SIZE_PRESETS` 数组：

```js
const SIZE_PRESETS = [
  { label: '自定义规格', w: 800, h: 600, note: '4:3', targetKB: 100 },
];
```

`targetKB` 为可选字段，填写后「裁切压缩」按钮会自动使用该目标体积。

---

### 技术栈（网页版）

- 原生 HTML + CSS + JavaScript（ES2020），无框架
- [exifr](https://github.com/MikeKovarik/exifr) — EXIF/IPTC/XMP 解析
- [heic2any](https://github.com/alexcorvi/heic2any) — HEIC 兜底解码
- Web Crypto API — SHA-256 指纹
- Canvas API — 格式转换、压缩、居中裁切

---

### 开源协议

MIT © 2026

---

---

## English

A 6-dimension image forensics toolkit available in two flavors:

| | Web Demo | AI Agent Skill |
|---|---|---|
| **How to use** | Browser, drag & drop | Talk to AI agent |
| **AI Detection** | Heuristic (metadata only) | Visual AI + metadata scoring |
| **Brand/IP Detection** | Keyword scan in metadata | Visual recognition across 15 company libraries |
| **Output** | Interactive report in browser | Structured Markdown report with scored verdict |
| **No server needed** | ✅ | ✅ (runs in Cursor) |

**[→ Live Demo](https://static.qiantucdn.com/share/imagedata/index.html)** &nbsp;·&nbsp; Double-click `index.html` to use locally

### Web Demo — Pure Frontend Tool

| Dimension | What it checks |
|---|---|
| 🔍 Format Forensics | Magic bytes, MIME type, SHA-256, encoding, extension mismatch |
| 📐 Resize & Compress | Center-crop to presets, compress to target file size, one-click combined op |
| 🤖 AI Detection | Heuristic signals: missing EXIF, UUID filename, AI resolutions, CreatorTool keywords |
| ⚠️ Brand/IP Risk | Keyword scan across filename + metadata for 100+ brands and cartoon IPs |
| 🖼 Visual Quality | Resolution, aspect ratio, color mode, DPI, JPEG quality estimate |
| 🗂 Origin Tracing | Full EXIF/IPTC/XMP, GPS reverse geocode, camera info, copyright fields |

**Supports**: JPEG · PNG · WebP · GIF · HEIC/HEIF (with fallback via heic2any)

**Limitations of the web version:**
- AI Detection relies on metadata heuristics only — cannot see pixel content
- Brand/IP Risk is keyword-based — cannot visually recognize logos or characters in the image

#### Usage

1. Open [Live Demo](https://static.qiantucdn.com/share/imagedata/index.html), or clone and double-click `index.html`
2. Drag & drop an image (or click to select) — supports multiple files
3. Browse the 6-dimension report
4. Use built-in tools to resize, compress, or convert format
5. Click "Copy Image" to paste directly into ChatGPT, Claude, etc.

No build step. No npm. No API keys. Works entirely in your browser.

---

### AI Agent Skill — Vision-Powered Deep Analysis

The `skill/` folder contains a [Cursor](https://cursor.sh) agent skill that upgrades two dimensions with real visual AI analysis:

**🤖 AI Generation Detection (upgraded)**

| Signal type | Score | Examples |
|---|---|---|
| Decisive evidence | 5 pts | Hand anatomy errors, unreadable text, CreatorTool = AI tool name |
| Strong support | 3 pts | Over-smooth skin, background physics violation, edge melting |
| Supporting signal | 2 pts | No EXIF, fabric pattern discontinuity |
| Weak signal | 1 pt | Glass-like eyes, AI-typical aspect ratio |

Threshold: 0–2 pts 🟢 Low · 3–5 pts 🟡 Suspected · ≥6 pts 🔴 High

**⚠️ Brand/IP Risk Detection (upgraded)**

Disney · Marvel · Warner/DC · Sanrio · Pop Mart · Nintendo · Pokémon · Japanese anime (Naruto, One Piece, Ghibli…) · Korean IPs · Chinese IPs · Luxury brands · Sports brands · Tech brands · F&B brands · Protected architecture

| Match type | Score |
|---|---|
| Complete character appearance (Mickey, Pikachu, Hello Kitty…) | 5 pts |
| Core Logo present (Nike Swoosh, Apple, LV monogram…) | 4 pts |
| Brand signature pattern (Burberry plaid, Chanel quilted…) | 3 pts |
| Partial brand element | 2 pts |
| Style similar, source uncertain | 1 pt |

Threshold: 0 pts 🟢 None · 1–3 pts 🟡 Medium · ≥4 pts 🔴 High

---

### Tech Stack (Web Demo)

- Vanilla HTML + CSS + JavaScript (ES2020) — no framework
- [exifr](https://github.com/MikeKovarik/exifr) — EXIF/IPTC/XMP parsing
- [heic2any](https://github.com/alexcorvi/heic2any) — HEIC decoding fallback
- Web Crypto API — SHA-256 fingerprinting
- Canvas API — format conversion, compression, center-crop resize

---

### License

MIT © 2026
