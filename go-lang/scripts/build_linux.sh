#!/bin/bash

# AirInputLan Linux 版本编译脚本（含 UPX 压缩）

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}[INFO]${NC} 开始编译 Linux 版本..."

# 设置环境变量
export GOOS=linux
export GOARCH=amd64
export CGO_ENABLED=0

# 创建输出目录
mkdir -p dist/linux

# 编译参数
LDFLAGS="-s -w"

# 编译
go build -ldflags "$LDFLAGS" -o dist/linux/AirInputLan

if [ $? -ne 0 ]; then
    echo "[ERROR] Linux 版本编译失败！"
    exit 1
fi

# 检查是否安装了 UPX
if command -v upx &> /dev/null; then
    echo -e "${YELLOW}[INFO]${NC} 使用 UPX 压缩可执行文件..."
    upx --best --lzma dist/linux/AirInputLan || echo -e "${YELLOW}[WARNING]${NC} UPX 压缩失败，使用未压缩版本"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[INFO]${NC} UPX 压缩完成"
    else
        echo -e "${YELLOW}[WARNING]${NC} UPX 压缩失败，使用未压缩版本"
    fi
else
    echo -e "${YELLOW}[WARNING]${NC} 未检测到 UPX，跳过压缩步骤"
    echo -e "${YELLOW}[INFO]${NC} 如需压缩，请安装 UPX: sudo dnf install upx"
fi

echo -e "${GREEN}[INFO]${NC} Linux 版本编译完成！"
echo -e "${GREEN}[INFO]${NC} 文件位置: dist/linux/AirInputLan"
echo -e "${GREEN}[INFO]${NC} 文件大小: $(du -h dist/linux/AirInputLan | cut -f1)"
echo ""
echo "运行方式:"
echo "  chmod +x dist/linux/AirInputLan"
echo "  ./dist/linux/AirInputLan"