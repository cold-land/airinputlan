#!/bin/bash

# AirInputLan macOS ARM64 版本编译脚本（Apple Silicon）

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[INFO]${NC} 开始编译 macOS ARM64 版本..."

# 设置环境变量
export GOOS=darwin
export GOARCH=arm64
export CGO_ENABLED=0

# 创建输出目录
mkdir -p dist

# 编译参数（添加 macOS 特定参数）
# -buildmode=pie: 位置无关可执行文件
# -ldflags: 链接器参数
LDFLAGS="-s -w -buildmode=pie"

# 编译
go build -ldflags "$LDFLAGS" -o dist/AirInputLan-arm64-macos

if [ $? -ne 0 ]; then
    echo "[ERROR] macOS ARM64 版本编译失败！"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} macOS ARM64 版本编译完成！"
echo -e "${GREEN}[INFO]${NC} 文件位置: dist/AirInputLan-arm64-macos"
echo -e "${GREEN}[INFO]${NC} 文件大小: $(du -h dist/AirInputLan-arm64-macos | cut -f1)"
echo ""
echo "如需压缩，请运行: ./scripts/compress.sh"
echo ""
echo "运行方式:"
echo "  chmod +x dist/AirInputLan-arm64-macos"
echo "  ./dist/AirInputLan-arm64-macos"
echo ""
echo "注意: 首次运行可能需要在 macOS 系统设置中允许运行未签名的应用"