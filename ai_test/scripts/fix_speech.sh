#!/bin/bash

# Ollama API 地址
API_URL="http://localhost:11434/api/generate"
DEFAULT_MODEL="qwen3:0.6b"


PROMPT_TEMPLATE=$(cat << 'EOF'
你是专业的语音识别文本修正助手，核心逻辑是先理解整句话的语义和使用场景，再针对性修正语音转文字的错误，仅输出修正后的纯文本，不要任何额外解释、标点或备注。
严格遵循以下通用修正规则：
1. 语义优先：基于整句话的语境和语义，判断并修正语音误听的同音字、错字、漏字、多字，尤其是技术场景的词汇（如英文/数字组合、专业术语）；
2. 保留核心：完全保留原句的数字、英文词汇、专有名词、核心语义和基本句式，仅修正错误，不增删、不改写原意；
3. 清理口语：移除无意义的语气词（嗯、啊、呢、吧、哦、呃、然后）、重复词汇（如我们我们、的的）、多余的无意义单字；
4. 规范格式：修正英文/技术词汇间的标点错误（如逗号换空格）、重复标点，保持原句整体标点和句式结构基本不变；
5. 拼写修正：基于语义修正技术词汇的字母重复、漏写、错写问题，还原正确的英文专业词汇。

待修正文本：{INPUT_TEXT}
EOF
)

# 显示帮助信息
show_help() {
    echo "用法：$0 [选项] [文本/文件路径]"
    echo "选项："
    echo "  -t <text>    处理单条语音识别文本"
    echo "  -f <file>    处理文本文件（每行一条待修正文本）"
    echo "  -m <model>   指定Ollama模型（默认：${DEFAULT_MODEL}）"
    echo "  -h           显示帮助信息"
    echo ""
    echo "示例："
    echo "  1. 处理单条文本：$0 -t '嗯，我们，我们今天来讨论3个问题吧？然后，嗯'"
    echo "  2. 处理文件：$0 -f ./speech_texts.txt"
    echo "  3. 指定模型处理：$0 -m llama3:8b -t '啊，这个接口调不通，然后，嗯'"
}


process_text() {
    local input_text="$1"
    local model="$2"
    
    # 替换提示词占位符（处理特殊字符转义，避免JSON解析错误）
    escaped_text=$(echo "$input_text" | sed -e 's/[\/&]/\\&/g')
    prompt=$(echo "${PROMPT_TEMPLATE}" | sed "s/{INPUT_TEXT}/${escaped_text}/g")
    
    # 构造JSON请求体（极致稳定参数，约束AI只按规则修正）
    request_body=$(jq -n \
        --arg model "$model" \
        --arg prompt "$prompt" \
        '{
            "model": $model,
            "prompt": $prompt,
            "stream": false,
            "options": {"temperature": 0.0, "top_p": 1.0, "num_ctx": 2048}
        }')
    
    # 调用API并提取结果
    response=$(curl -s -X POST "${API_URL}" \
        -H "Content-Type: application/json" \
        -d "${request_body}")
    
    # 解析JSON，提取修正后的文本（处理空响应/错误）
    fixed_text=$(echo "$response" | jq -r '.response // "处理失败"')
    echo "原始文本：${input_text}"
    echo "修正文本：${fixed_text}"
    echo "-------------------------"
}

# 主逻辑：解析参数
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

model="${DEFAULT_MODEL}"
while getopts "t:f:m:h" opt; do
    case $opt in
        t)
            # 处理单条文本
            input_text="$OPTARG"
            process_text "$input_text" "$model"
            ;;
        f)
            # 处理文件（每行一条）
            file_path="$OPTARG"
            if [ ! -f "$file_path" ]; then
                echo "错误：文件 ${file_path} 不存在！"
                exit 1
            fi
            echo "开始处理文件：${file_path}"
            echo "-------------------------"
            while IFS= read -r line; do
                # 跳过空行
                if [ -z "$line" ]; then
                    continue
                fi
                process_text "$line" "$model"
            done < "$file_path"
            ;;
        m)
            model="$OPTARG"
            ;;
        h)
            show_help
            exit 0
            ;;
        \?)
            echo "错误：无效选项 -$OPTARG"
            show_help
            exit 1
            ;;
        :)
            echo "错误：选项 -$OPTARG 需要传入参数"
            show_help
            exit 1
            ;;
    esac
done
