#!/bin/bash

# Paper Tauri 构建脚本

set -e

echo "🚀 Paper Tauri 构建脚本"
echo "========================"

# 检查 Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust 未安装"
    echo "请访问 https://rustup.rs/ 安装 Rust"
    exit 1
fi

echo "✓ Rust: $(rustc --version)"

# 检查 Tauri CLI
if ! command -v cargo-tauri &> /dev/null; then
    echo "📦 安装 Tauri CLI..."
    cargo install tauri-cli
fi

echo "✓ Tauri CLI"

# 进入项目目录
cd "$(dirname "$0")"

# 构建
echo ""
echo "🔨 开始构建..."
cargo tauri build

echo ""
echo "✅ 构建完成！"
echo ""
echo "输出位置:"
echo "  - macOS: src-tauri/target/release/bundle/"
echo ""
