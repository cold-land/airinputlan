#!/bin/bash

# AirInputLan Windows 版本编译脚本

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}[INFO]${NC} 开始编译 Windows 版本..."

# 设置环境变量
export GOOS=windows
export GOARCH=amd64
export CGO_ENABLED=0

# 创建输出目录
mkdir -p dist

# 编译参数
LDFLAGS="-s -w"

# 编译
go build -ldflags "$LDFLAGS" -o dist/AirInputLan-x86_64-win.exe

if [ $? -ne 0 ]; then
    echo "[ERROR] Windows 版本编译失败！"
    exit 1
fi

echo -e "${GREEN}[INFO]${NC} Windows 版本编译完成！"
echo -e "${GREEN}[INFO]${NC} 文件位置: dist/AirInputLan-x86_64-win.exe"
echo -e "${GREEN}[INFO]${NC} 文件大小: $(du -h dist/AirInputLan-x86_64-win.exe | cut -f1)"
echo ""
echo "如需压缩，请运行: ./scripts/compress.sh"
echo ""
echo "运行方式:"
echo "  双击 dist/AirInputLan-x86_64-win.exe"