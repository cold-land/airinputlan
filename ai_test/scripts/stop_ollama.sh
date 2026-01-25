#!/bin/bash
set -e

# 彩色输出
info() { echo -e "\033[34m[INFO] $1\033[0m"; }
success() { echo -e "\033[32m[SUCCESS] $1\033[0m"; }
warning() { echo -e "\033[33m[WARNING] $1\033[0m"; }

# 第一步：杀死Ollama进程
info "查找Ollama进程..."
OLLAMA_PIDS=$(pgrep -f "ollama serve" || true)
if [ -n "$OLLAMA_PIDS" ]; then
    info "杀死Ollama进程：$OLLAMA_PIDS"
    sudo kill -9 $OLLAMA_PIDS &> /dev/null
    
    # 验证是否杀干净
    sleep 2
    REMAIN_PIDS=$(pgrep -f "ollama serve" || true)
    if [ -n "$REMAIN_PIDS" ]; then
        warning "仍有残留进程：$REMAIN_PIDS，再次强制杀死"
        sudo kill -9 $REMAIN_PIDS &> /dev/null
    fi
    success "所有Ollama进程已清理"
else
    info "未找到Ollama进程"
fi

# 第二步：关闭端口（可选，验证）
if nc -z 127.0.0.1 11434; then
    warning "端口11434仍在监听（可能有残留）"
else
    info "端口11434已关闭"
fi

# 第三步：清理日志（可选）
rm -f /tmp/ollama.log

success "✅ Ollama已彻底停止！"
