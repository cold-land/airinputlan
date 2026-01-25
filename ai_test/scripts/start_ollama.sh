#!/bin/bash
set -e

# 核心配置
MODEL_NAME="qwen3:0.6b"
CPU_THREADS=$(nproc)  # CPU逻辑线程数
GPU_LAYERS=-1         # -1=全部GPU加载，0=禁用GPU

# 彩色输出
info() { echo -e "\033[34m[INFO] $1\033[0m"; }
success() { echo -e "\033[32m[SUCCESS] $1\033[0m"; }
error() { echo -e "\033[31m[ERROR] $1\033[0m"; exit 1; }

# 第一步：先停止已有Ollama进程（避免冲突）
info "清理已有Ollama进程..."
OLLAMA_PIDS=$(pgrep -f "ollama serve" || true)
if [ -n "$OLLAMA_PIDS" ]; then
    sudo kill -9 $OLLAMA_PIDS &> /dev/null
    info "已杀死旧进程：$OLLAMA_PIDS"
fi

# 第二步：设置环境变量（GPU+CPU优化）
export OLLAMA_NUM_THREADS=$CPU_THREADS
export OLLAMA_GPU_LAYERS=$GPU_LAYERS
export OLLAMA_CUDA=1
export OLLAMA_HOST=127.0.0.1:11434

# 第三步：后台启动Ollama（nohup避免终端关闭后退出）
info "启动Ollama（CPU线程=$CPU_THREADS | GPU分层=$GPU_LAYERS）..."
nohup ollama serve > /tmp/ollama.log 2>&1 &
sleep 5  # 等待进程启动

# 第四步：验证进程是否启动
OLLAMA_PID=$(pgrep -f "ollama serve" | head -1)
if [ -z "$OLLAMA_PID" ]; then
    error "Ollama启动失败！查看日志：/tmp/ollama.log"
fi
success "Ollama进程启动成功（PID：$OLLAMA_PID）"

# 第五步：等待端口就绪
info "等待API端口11434就绪..."
if ! command -v nc &> /dev/null; then
    sudo dnf install -y nc || error "安装nc工具失败"
fi
WAIT_COUNT=0
while ! nc -z 127.0.0.1 11434; do
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $WAIT_COUNT -gt 30 ]; then
        error "端口11434未就绪！日志：/tmp/ollama.log"
    fi
    sleep 1
done

# 第六步：拉取/加载模型
info "处理模型 $MODEL_NAME..."
if ! ollama list | grep -q "$MODEL_NAME"; then
    info "拉取模型 $MODEL_NAME（首次需下载）..."
    ollama pull "$MODEL_NAME" || error "模型拉取失败"
fi
success "模型 $MODEL_NAME 已加载完成！"
success "✅ Ollama启动完成！API地址：http://localhost:11434/api/generate"
success "日志文件：/tmp/ollama.log | 进程PID：$OLLAMA_PID"
