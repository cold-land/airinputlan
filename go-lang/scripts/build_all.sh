#!/bin/bash

# AirInputLan 统一编译脚本（含 UPX 压缩）
# 用于编译所有平台的版本

set -e  # 遇到错误立即退出

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 切换到项目根目录
cd "$PROJECT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查 Go 版本
check_go_version() {
    print_info "检查 Go 版本..."
    if ! command -v go &> /dev/null; then
        print_error "Go 未安装，请先安装 Go 1.25.6 或更高版本"
        exit 1
    fi

    GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    print_info "当前 Go 版本: $GO_VERSION"
}

# 检查 UPX
check_upx() {
    if command -v upx &> /dev/null; then
        print_info "检测到 UPX，将使用 UPX 压缩"
        return 0
    else
        print_warning "未检测到 UPX，将跳过压缩步骤"
        print_info "如需压缩，请安装 UPX:"
        print_info "  Linux:   sudo dnf install upx"
        print_info "  macOS:   brew install upx"
        print_info "  Windows: 从 https://upx.github.io/ 下载"
        return 1
    fi
}

# 编译函数
build_platform() {
    local PLATFORM=$1
    local GOOS=$2
    local GOARCH=$3
    local OUTPUT=$4
    local LDFLAGS=$5

    print_info "开始编译 $PLATFORM 版本..."

    # 设置环境变量
    export GOOS=$GOOS
    export GOARCH=$GOARCH
    export CGO_ENABLED=0

    # 创建输出目录
    mkdir -p "$(dirname "$OUTPUT")"

    # 编译
    go build -ldflags "$LDFLAGS" -o "$OUTPUT"

    if [ $? -ne 0 ]; then
        print_error "$PLATFORM 版本编译失败！"
        exit 1
    fi

    print_info "$PLATFORM 版本编译完成！"
    print_info "文件位置: $OUTPUT"
    print_info "文件大小: $(du -h "$OUTPUT" | cut -f1)"

    # UPX 压缩
    if check_upx; then
        print_info "使用 UPX 压缩..."
        # macOS 版本需要特殊参数
        if [ "$PLATFORM" = "macOS" ]; then
            upx --best --lzma --force-macos "$OUTPUT" || print_warning "UPX 压缩失败，使用未压缩版本"
        else
            upx --best --lzma "$OUTPUT" || print_warning "UPX 压缩失败，使用未压缩版本"
        fi
        if [ $? -eq 0 ]; then
            print_info "UPX 压缩完成"
            print_info "压缩后大小: $(du -h "$OUTPUT" | cut -f1)"
        else
            print_warning "UPX 压缩失败，使用未压缩版本"
        fi
    fi
}

# 主函数
main() {
    print_info "===================="
    print_info "AirInputLan 编译脚本 v1.1"
    print_info "===================="
    echo ""

    check_go_version
    echo ""
    check_upx
    echo ""

    # 编译参数
    COMMON_LDFLAGS="-s -w"

    # 编译 Linux 版本
    build_platform "Linux" "linux" "amd64" "dist/linux/AirInputLan" "$COMMON_LDFLAGS"
    echo ""

    # 编译 macOS 版本
    build_platform "macOS" "darwin" "amd64" "dist/macos/AirInputLan" "$COMMON_LDFLAGS"
    echo ""

    # 编译 Windows 版本
    build_platform "Windows" "windows" "amd64" "dist/windows/AirInputLan.exe" "$COMMON_LDFLAGS"
    echo ""

    print_info "===================="
    print_info "所有版本编译完成！"
    print_info "===================="
    echo ""
    print_info "编译产物:"
    print_info "  Linux:   dist/linux/AirInputLan"
    print_info "  macOS:   dist/macos/AirInputLan"
    print_info "  Windows: dist/windows/AirInputLan.exe"
    echo ""
    print_info "运行方式:"
    print_info "  Linux:   chmod +x dist/linux/AirInputLan && ./dist/linux/AirInputLan"
    print_info "  macOS:   ./dist/macos/AirInputLan"
    print_info "  Windows: 双击 dist/windows/AirInputLan.exe"
    echo ""
}

# 运行主函数
main "$@"