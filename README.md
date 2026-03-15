# Paper Markdown

> 极速 Markdown 预览 CLI 工具
> 
> *冷静、有人文感的数字宣纸*

[![Crates.io](https://img.shields.io/crates/v/paper-markdown.svg)](https://crates.io/crates/paper-markdown)
[![Rust](https://img.shields.io/badge/Rust-1.70%2B-orange.svg)](https://www.rust-lang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ✨ 特性

- 🚀 **极速启动** - Rust 原生性能，启动时间 < 1秒
- 🪟 **独立窗口** - 使用系统 WebView，无浏览器 UI
- 📝 **实时预览** - 文件修改自动刷新
- 🎨 **数字宣纸** - 优雅的排版风格
- 💾 **内存优化** - 内存占用仅 ~20MB（对比 Electron ~150MB）
- 🔕 **静默运行** - 默认无终端输出，可加 `--log` 查看

---

## 📦 安装

### 方式一：预编译二进制（推荐，无需 Rust）

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/jqlong17/paper-markdown/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
# 下载最新版本 (Intel/AMD 处理器)
Invoke-WebRequest -Uri "https://github.com/jqlong17/paper-markdown/releases/latest/download/paper-markdown-x86_64-pc-windows-msvc.exe" -OutFile "$env:USERPROFILE\paper-markdown.exe"

# 添加到 PATH (可选)
$env:PATH += ";$env:USERPROFILE"

# 或者手动下载
# https://github.com/jqlong17/paper-markdown/releases/latest
```

### 方式二：Cargo 安装（需要 Rust）

```bash
cargo install paper-markdown
```

### 方式三：从源码构建

```bash
git clone https://github.com/jqlong17/paper-markdown.git
cd paper-markdown
cargo build --release
```

---

## 🚀 使用方法

```bash
# 打开 Markdown 文件（静默模式）
paper-markdown demo.md

# 显示日志输出
paper-markdown --log demo.md

# 查看帮助
paper-markdown --help

# 查看版本
paper-markdown --version
```

### Tab 自动补全（zsh）

让 `paper` 在输入参数时按 `Tab` 自动补全文件名（仅补全 `.md` / `.markdown`）：

```bash
mkdir -p ~/.zsh/completions
paper --generate-completion zsh > ~/.zsh/completions/_paper
grep -q 'fpath=(~/.zsh/completions $fpath)' ~/.zshrc || echo 'fpath=(~/.zsh/completions $fpath)' >> ~/.zshrc
grep -q 'autoload -Uz compinit && compinit' ~/.zshrc || echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
source ~/.zshrc
```

然后输入：`paper <Tab>` 或 `paper xx<Tab>` 即可补全。

### 多窗口支持

可以同时打开多个文件，每个窗口独立运行：

```bash
paper-markdown doc1.md
paper-markdown doc2.md
paper-markdown doc3.md
# 终端不会阻塞，可以继续使用
```

---

## 🎨 设计哲学

**Paper** 追求"冷静、有人文感"的阅读体验：

| 设计元素 | 实现方式 |
|---------|---------|
| **配色** | 象牙白 `#F9F8F2` + 深炭灰 `#333333` |
| **字体** | Noto Serif SC 衬线体 |
| **动效** | 1.2s 淡入，模拟墨迹晕开 |
| **排版** | 1.8 行高，0.03em 字间距 |
| **沉浸** | 隐藏滚动条，独立窗口 |

---

## 📊 性能对比

| 方案 | 内存占用 | 启动时间 | 包体积 | 需要安装 |
|------|---------|----------|--------|----------|
| **Paper Markdown** | **~20MB** | **<1s** | **~2MB** | ❌ 无需 |
| Electron | ~150MB | ~3s | ~150MB | ❌ 无需 |
| Node.js + 浏览器 | ~50MB | ~2s | ~80MB | ✅ Node.js |

---

## 🛠️ 技术栈

- **后端**: Rust
- **HTTP 服务器**: warp
- **Markdown 解析**: pulldown-cmark
- **窗口管理**: tao
- **WebView**: wry
- **前端**: 纯 HTML/CSS

---

## 📄 License

MIT © [jqlong17](https://github.com/jqlong17)

---

> 在数字世界中，寻找纸张的温度。
