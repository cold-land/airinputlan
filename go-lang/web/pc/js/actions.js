// 动作系统 - 执行具体操作

/**
 * HTML 转义函数，防止 XSS 攻击
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 检测重复字并高亮
 * 注意：此函数使用 innerHTML 插入内容，但所有用户输入都已通过 escapeHtml() 转义
 */
function highlightDuplicates(text) {
    if (!text) return text;

    // 先转义 HTML 特殊字符
    const escapedText = escapeHtml(text);

    let result = '';
    let i = 0;

    while (i < escapedText.length) {
        // 检测双字重复
        if (i + 3 < escapedText.length) {
            const twoChars = escapedText.substring(i, i + 2);
            const nextTwoChars = escapedText.substring(i + 2, i + 4);
            if (twoChars === nextTwoChars) {
                result += `<span class="highlight">${twoChars}${twoChars}</span>`;
                i += 4;
                continue;
            }
        }

        // 检测单字重复
        if (i + 1 < escapedText.length) {
            const char = escapedText[i];
            const nextChar = escapedText[i + 1];
            if (char === nextChar) {
                result += `<span class="highlight">${char}${char}</span>`;
                i += 2;
                continue;
            }
        }

        result += escapedText[i];
        i++;
    }

    return result;
}

/**
 * 浏览器复制
 * 使用 navigator.clipboard API 复制文本到剪贴板
 */
function copyToBrowser(text) {
    navigator.clipboard.writeText(text).catch(err => {
        console.error('浏览器复制失败:', err);
    });
}

/**
 * 服务端复制
 * 通知服务端执行剪贴板操作（占位实现）
 * 未来将实现 WebSocket/HTTP 通信，调用 Go 服务端剪贴板 API
 */
function copyToServer(text) {
    // 占位实现：输出控制台消息
    console.log('[服务端复制]', text);
    
    // 未来实现：
    // 1. 通过 WebSocket 通知服务端
    // 2. 或通过 HTTP POST 调用 /api/copy 端点
    // 3. 服务端使用 github.com/atotto/clipboard 库执行系统剪贴板操作
}

/**
 * 调用本地 Ollama API
 * @param {string} prompt - 提示词
 * @returns {Promise<string>} - AI 返回的处理后的文本
 */
async function callLocalAPI(prompt) {
    const response = await fetch(aiConfig.localApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: aiConfig.localModel,
            prompt: prompt,
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(`本地 API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
}

/**
 * 调用在线 API（智谱 AI / 阿里心流）
 * 支持流式输出
 * @param {string} prompt - 提示词
 * @param {function} onChunk - 流式输出回调函数
 * @param {function} onComplete - 完成回调函数
 * @returns {Promise<string>} - AI 返回的完整文本
 */
async function callOnlineAPI(prompt, onChunk, onComplete) {
    const provider = aiConfig.onlineProvider || 'zhipu';
    const apiKey = aiConfig.onlineApiKeys && aiConfig.onlineApiKeys[provider];
    const model = aiConfig.onlineModels && aiConfig.onlineModels[provider];
    
    let apiUrl = '';
    let requestBody = {
        model: model,
        messages: [
            { role: "system", content: aiConfig.aiPromptTemplate },
            { role: "user", content: prompt }
        ],
        stream: true,
        max_tokens: 1024,
        temperature: 0.3
    };

    switch (provider) {
        case 'iflow':
            apiUrl = 'https://apis.iflow.cn/v1/chat/completions';
            break;
        case 'zhipu':
        default:
            apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            requestBody.thinking = { type: "disabled" };
            break;
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`在线 API 请求失败: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                if (data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);
                    const content = json.choices[0]?.delta?.content;
                    if (content) {
                        fullText += content;
                        onChunk(fullText);
                    }
                } catch (e) {
                    // 忽略解析错误
                }
            }
        }
    }

    if (!fullText || fullText.trim() === '') {
        throw new Error('AI返回空结果');
    }

    if (onComplete) {
        onComplete(fullText);
    }

    return fullText;
}