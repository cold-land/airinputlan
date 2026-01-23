#!/bin/bash

# AirInputLan 统一编译脚本
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
}

# 主函数
main() {
    print_info "===================="
    print_info "AirInputLan 编译脚本 v1.1"
    print_info "===================="
    echo ""

    check_go_version
    echo ""

    # 编译参数
    COMMON_LDFLAGS="-s -w"

    # 编译 Linux 版本
    build_platform "Linux" "linux" "amd64" "dist/AirInputLan-x86_64-linux" "$COMMON_LDFLAGS"
    echo ""

    # 编译 macOS x86_64 版本（Intel Mac）
    build_platform "macOS x86_64" "darwin" "amd64" "dist/AirInputLan-x86_64-macos" "$COMMON_LDFLAGS"
    echo ""

    # 编译 macOS ARM64 版本（Apple Silicon Mac）
    build_platform "macOS ARM64" "darwin" "arm64" "dist/AirInputLan-arm64-macos" "$COMMON_LDFLAGS"
    echo ""

    # 编译 Windows 版本
    build_platform "Windows" "windows" "amd64" "dist/AirInputLan-x86_64-win.exe" "$COMMON_LDFLAGS"
    echo ""

    print_info "===================="
    print_info "所有版本编译完成！"
    print_info "===================="
    echo ""
    print_info "编译产物:"
    print_info "  Linux:   dist/AirInputLan-x86_64-linux"
    print_info "  macOS:   dist/AirInputLan-x86_64-macos (Intel)"
    print_info "  macOS:   dist/AirInputLan-arm64-macos (Apple Silicon)"
    print_info "  Windows: dist/AirInputLan-x86_64-win.exe"
    echo ""
    print_info "如需压缩，请运行: ./scripts/compress.sh"
    echo ""
    print_info "运行方式:"
    print_info "  Linux:   chmod +x dist/AirInputLan-x86_64-linux && ./dist/AirInputLan-x86_64-linux"
    print_info "  macOS (Intel):   ./dist/AirInputLan-x86_64-macos"
    print_info "  macOS (Apple Silicon):   ./dist/AirInputLan-arm64-macos"
    print_info "  Windows: 双击 dist/AirInputLan-x86_64-win.exe"
    echo ""
}

# 运行主函数
main "$@"