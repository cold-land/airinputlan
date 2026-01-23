#!/bin/bash

# AirInputLan 压缩脚本
# 使用 UPX 压缩 dist 目录下的所有可执行文件

set -e  # 遇到错误立即退出

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 切换到项目根目录
cd "$PROJECT_DIR"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查 UPX
check_upx() {
    if command -v upx &> /dev/null; then
        print_info "检测到 UPX"
        return 0
    else
        print_error "未检测到 UPX"
        print_info "请安装 UPX:"
        print_info "  Linux:   sudo dnf install upx"
        print_info "  macOS:   brew install upx"
        print_info "  Windows: 从 https://upx.github.io/ 下载"
        exit 1
    fi
}

# 压缩文件
compress_file() {
    local FILE=$1
    local FILENAME=$(basename "$FILE")
    
    print_info "压缩: $FILENAME"
    
    # macOS 版本需要特殊参数
    if [[ "$FILENAME" == *macos* ]]; then
        upx --best --lzma --force-macos "$FILE" || {
            print_warning "$FILENAME 压缩失败"
            return 1
        }
    else
        upx --best --lzma "$FILE" || {
            print_warning "$FILENAME 压缩失败"
            return 1
        }
    fi
    
    if [ $? -eq 0 ]; then
        local NEW_SIZE=$(du -h "$FILE" | cut -f1)
        print_info "  压缩后大小: $NEW_SIZE"
    fi
}

# 主函数
main() {
    print_info "===================="
    print_info "AirInputLan 压缩脚本"
    print_info "===================="
    echo ""
    
    check_upx
    echo ""
    
    print_info "开始压缩 dist 目录下的可执行文件..."
    echo ""
    
    # 查找所有可执行文件
    local FILES=()
    while IFS= read -r -d '' file; do
        FILES+=("$file")
    done < <(find dist -type f -print0)
    
    if [ ${#FILES[@]} -eq 0 ]; then
        print_warning "dist 目录中没有找到可执行文件"
        print_info "请先运行编译脚本: bash scripts/build_all.sh"
        exit 1
    fi
    
    # 压缩每个文件
    for file in "${FILES[@]}"; do
        compress_file "$file"
        echo ""
    done
    
    print_info "===================="
    print_info "压缩完成！"
    print_info "===================="
    echo ""
}

# 运行主函数
main "$@"