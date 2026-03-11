# Paper CLI

> 极简 Markdown 预览 CLI 工具
> 
> *冷静、有人文感的数字宣纸*

[![GitHub stars](https://img.shields.io/github/stars/jqlong17/paper-cli?style=social)](https://github.com/jqlong17/paper-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 安装

### 方式一：从 GitHub 直接安装（推荐）

```bash
npm install -g jqlong17/paper-cli

# 使用
paper demo.md
```

### 方式二：从源码安装

```bash
git clone https://github.com/jqlong17/paper-cli.git
cd paper-cli
npm install
npm link

# 使用
paper demo.md
```

---

## 使用方法

### 默认模式：独立窗口（Electron）

```bash
# 使用独立窗口预览，无需浏览器
paper README.md
```

### 浏览器模式

```bash
# 使用系统默认浏览器打开
paper README.md --browser

# 简写
paper README.md -b
```

### 帮助

```bash
paper --help
```

---

## 功能特性

| 特性 | 描述 |
|------|------|
| 🪟 独立窗口 | 默认使用 Electron，无需浏览器 |
| 🌐 浏览器支持 | `--browser` 选项使用系统浏览器 |
| 📝 实时读取 | 每次刷新获取最新内容 |
| 🎨 极简设计 | 数字宣纸风格，沉浸阅读 |
| ⚡ 轻量级 | 仅依赖 `electron`, `markdown-it` 和 `open` |
| 🖥️ 友好输出 | 中文终端提示，优雅边框 |
| 📊 完整日志 | 自动记录每次运行的详细日志 |

---

## 设计哲学

**Paper** 追求的是一种"冷静、有人文感"的阅读体验：

- **配色**：象牙白背景 `#F9F8F2` + 深炭灰文字 `#333333`
- **字体**：Noto Serif SC 衬线体，营造书卷气
- **动效**：1.2s 淡入效果，模拟墨迹晕开
- **排版**：1.8 行高，0.03em 字间距，呼吸感十足
- **沉浸**：隐藏滚动条，去除生硬边框

---

## 终端输出示例

### 独立窗口模式

```
╔════════════════════════════════════════════════╗
║              [paper] 数字宣纸                  ║
╠════════════════════════════════════════════════╣
║ 正在为您展开纸张...
║ 文件: README.md
║ 模式: 独立窗口
╠════════════════════════════════════════════════╣
║ 按 Ctrl+Q 或关闭窗口退出
╚════════════════════════════════════════════════╝

[paper] 独立窗口已打开 ✓
```

### 浏览器模式

```
╔════════════════════════════════════════════════╗
║              [paper] 数字宣纸                  ║
╠════════════════════════════════════════════════╣
║ 正在为您展开纸张...
║ 文件: README.md
║ 地址: http://localhost:3088
╠════════════════════════════════════════════════╣
║ 按 Ctrl+C 关闭服务
╚════════════════════════════════════════════════╝

[paper] 已在浏览器中展开纸张 ✓
```

---

## 开发

### 目录结构

```
paper-cli/
├── paper.js          # 主 CLI 文件
├── package.json      # 项目配置
├── README.md         # 文档
├── LICENSE           # MIT 许可证
├── test/             # 测试用例
│   ├── basic.md      # 基础功能测试
│   ├── chinese.md    # 中文排版测试
│   ├── edge-cases.md # 边界测试
│   └── empty.md      # 空文档测试
├── test.js           # 测试脚本
└── log/              # 运行日志
```

### 运行测试

```bash
# 运行所有测试
node test.js

# 运行指定测试
node test.js basic

# 使用浏览器模式测试
node test.js --browser

# 查看日志
node test.js --logs
```

### 查看日志

每次运行都会自动生成日志文件，保存在 `log/` 目录下：

```bash
# 查看最新日志摘要
node test.js --logs

# 或直接查看日志文件
ls log/
cat log/paper_2024-XX-XX_XXXXXX.log
```

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Q` | 退出应用（独立窗口模式） |
| `Ctrl+R` | 刷新页面 |
| `Ctrl++` / `Ctrl+-` | 放大/缩小 |

---

## 依赖

- [electron](https://github.com/electron/electron) - 独立窗口支持
- [markdown-it](https://github.com/markdown-it/markdown-it) - Markdown 渲染引擎
- [open](https://github.com/sindresorhus/open) - 跨平台打开浏览器

---

## License

MIT © [jqlong17](https://github.com/jqlong17)
