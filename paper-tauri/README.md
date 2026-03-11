# Paper Tauri 版本

使用 Rust + Tauri 重构的高性能版本，内存占用降低 90%！

## 性能对比

| 指标 | Electron 版本 | Tauri 版本 | 提升 |
|------|--------------|-----------|------|
| **内存占用** | ~150 MB | ~15 MB | **10x** |
| **启动时间** | ~3s | ~0.5s | **6x** |
| **包体积** | ~150 MB | ~5 MB | **30x** |
| **冷启动** | 慢 | 瞬时 | **丝滑** |

## 安装要求

- Rust 1.70+ (https://rustup.rs/)
- Tauri CLI: `cargo install tauri-cli`

## 快速开始

```bash
cd paper-tauri

# 开发模式
cargo tauri dev

# 构建发布版本
./build.sh
# 或
cargo tauri build
```

## 功能特性

- ✅ 拖拽打开文件
- ✅ 命令行支持 `paper-tauri file.md`
- ✅ 实时渲染
- ✅ 同样的数字宣纸风格
- ✅ 键盘快捷键 (Ctrl+R 刷新, Ctrl+O 打开)
- ✅ 多窗口支持

## 技术栈

- **后端**: Rust + Tauri
- **Markdown 引擎**: pulldown-cmark (Rust 原生，极速)
- **前端**: 纯 HTML/CSS/JS
- **WebView**: 系统原生 (macOS WebKit, Windows WebView2, Linux WebKitGTK)

## 为什么更快？

1. **无 Chromium**: 使用系统自带 WebView，无需打包浏览器内核
2. **Rust 性能**: Markdown 解析用原生 Rust 代码，比 Node.js 快 10-100 倍
3. **内存效率**: 无 V8 引擎开销，内存占用极低
4. **启动优化**: 二进制体积小，加载快

## 许可证

MIT © jqlong17
