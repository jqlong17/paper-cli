#!/bin/bash

# Paper Markdown 安装脚本
# 从 GitHub Releases 下载预编译二进制

set -e

REPO="jqlong17/paper-markdown"
VERSION="v1.0.0"
INSTALL_DIR="/usr/local/bin"

# 获取平台信息
get_platform() {
    local platform=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)
    
    case "$platform" in
        linux)
            platform="unknown-linux-gnu"
            ;;
        darwin)
            platform="apple-darwin"
            ;;
        mingw*|msys*|cygwin*)
            platform="pc-windows-msvc"
            ;;
        *)
            echo "不支持的平台: $platform"
            exit 1
            ;;
    esac
    
    case "$arch" in
        x86_64|amd64)
            arch="x86_64"
            ;;
        aarch64|arm64)
            arch="aarch64"
            ;;
        *)
            echo "不支持的架构: $arch"
            exit 1
            ;;
    esac
    
    echo "${arch}-${platform}"
}

# 主函数
main() {
    echo "📦 安装 Paper Markdown..."
    
    PLATFORM=$(get_platform)
    echo "✓ 检测到平台: $PLATFORM"
    
    # 构建下载 URL
    if [ "$PLATFORM" = "x86_64-pc-windows-msvc" ]; then
        FILENAME="paper-markdown-${PLATFORM}.exe"
        OUTPUT_NAME="paper-markdown.exe"
    else
        FILENAME="paper-markdown-${PLATFORM}.tar.gz"
        OUTPUT_NAME="paper-markdown"
    fi
    
    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${FILENAME}"
    
    echo "📥 正在下载: $DOWNLOAD_URL"
    
    # 创建临时目录
    TMP_DIR=$(mktemp -d)
    cd "$TMP_DIR"
    
    # 下载文件
    if command -v curl &> /dev/null; then
        curl -L -o "$FILENAME" "$DOWNLOAD_URL" --silent --show-error || {
            echo "❌ 下载失败"
            echo "💡 请手动从 https://github.com/$REPO/releases 下载"
            exit 1
        }
    elif command -v wget &> /dev/null; then
        wget -q "$DOWNLOAD_URL" -O "$FILENAME" || {
            echo "❌ 下载失败"
            echo "💡 请手动从 https://github.com/$REPO/releases 下载"
            exit 1
        }
    else
        echo "❌ 需要 curl 或 wget"
        exit 1
    fi
    
    echo "✓ 下载完成"
    
    # 解压
    if [[ "$FILENAME" == *.tar.gz ]]; then
        tar xzf "$FILENAME"
    elif [[ "$FILENAME" == *.zip ]]; then
        unzip -q "$FILENAME"
    fi
    
    # 安装
    echo "📋 安装到 $INSTALL_DIR..."
    
    if [ -w "$INSTALL_DIR" ]; then
        mv "$OUTPUT_NAME" "$INSTALL_DIR/"
    else
        echo "🔑 需要管理员权限..."
        sudo mv "$OUTPUT_NAME" "$INSTALL_DIR/"
    fi
    
    # 设置权限
    if [ "$PLATFORM" != "x86_64-pc-windows-msvc" ]; then
        chmod +x "$INSTALL_DIR/$OUTPUT_NAME"
    fi
    
    # 清理
    cd -
    rm -rf "$TMP_DIR"
    
    echo ""
    echo "✅ 安装成功！"
    echo ""
    echo "📝 使用方法:"
    echo "   paper-markdown <file.md>"
    echo "   paper-markdown --log <file.md>  # 显示日志"
    echo ""
    echo "🔗 更多信息: https://github.com/$REPO"
}

main "$@"
