#!/bin/bash

# AirInputLan macOS 版本编译脚本（支持 x86_64 和 arm64）

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}[INFO]${NC} 开始编译 macOS 版本..."

# 编译参数（添加 macOS 特定参数）
# -buildmode=pie: 位置无关可执行文件
# -ldflags: 链接器参数
LDFLAGS="-s -w -buildmode=pie"

# 创建输出目录
mkdir -p dist

# 编译 x86_64 版本（Intel Mac）
echo -e "${YELLOW}[INFO]${NC} 编译 macOS x86_64 版本..."
export GOOS=darwin
export GOARCH=amd64
export CGO_ENABLED=0
go build -ldflags "$LDFLAGS" -o dist/AirInputLan-x86_64-macos

if [ $? -ne 0 ]; then
    echo "[ERROR] macOS x86_64 版本编译失败！"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} macOS x86_64 版本编译完成！"
echo -e "${GREEN}[INFO]${NC} 文件位置: dist/AirInputLan-x86_64-macos"
echo -e "${GREEN}[INFO]${NC} 文件大小: $(du -h dist/AirInputLan-x86_64-macos | cut -f1)"
echo ""

# 编译 arm64 版本（Apple Silicon Mac）
echo -e "${YELLOW}[INFO]${NC} 编译 macOS arm64 版本..."
export GOOS=darwin
export GOARCH=arm64
export CGO_ENABLED=0
go build -ldflags "$LDFLAGS" -o dist/AirInputLan-arm64-macos

if [ $? -ne 0 ]; then
    echo "[ERROR] macOS arm64 版本编译失败！"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} macOS arm64 版本编译完成！"
echo -e "${GREEN}[INFO]${NC} 文件位置: dist/AirInputLan-arm64-macos"
echo -e "${GREEN}[INFO]${NC} 文件大小: $(du -h dist/AirInputLan-arm64-macos | cut -f1)"
echo ""

echo -e "${GREEN}[INFO]${NC} 所有 macOS 版本编译完成！"
echo ""
echo "如需压缩，请运行: ./scripts/compress.sh"
echo ""
echo "运行方式:"
echo "  Intel Mac:  ./dist/AirInputLan-x86_64-macos"
echo "  Apple Silicon Mac:  ./dist/AirInputLan-arm64-macos"