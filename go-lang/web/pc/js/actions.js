// 动作系统 - 执行具体操作

// 全局标志位，用于防止并发请求（直接挂载到 window 对象）
window.isAITestRunning = false;      // AI 测试是否正在运行
window.isAIProcessingRunning = false;  // AI 处理是否正在运行
window.aiRequestAbortController = null;  // 全局 AbortController，用于取消正在进行的请求

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
 * 保存卡片编辑
 * 更新卡片内容和原始文本属性
 * @param {HTMLElement} card - 卡片元素
 * @param {string} newText - 新文本内容
 * @param {string} originalText - 原始文本内容
 */
function saveCardEdit(card, newText, originalText) {
    const cardContent = card.querySelector('.card-content');

    if (newText && newText !== originalText) {
        // 更新卡片内容（带高亮）
        cardContent.innerHTML = highlightDuplicates(newText);
        // 更新 data-original-text 属性
        card.dataset.originalText = newText;
    } else {
        // 恢复原始内容（带高亮）
        cardContent.innerHTML = highlightDuplicates(originalText);
    }

    // 移除编辑状态
    card.classList.remove('editing');
}

/**
 * 调用 Ollama 本地 API（流式输出）
 * @param {string} prompt - 提示词
 * @param {function} onChunk - 流式输出回调函数
 * @param {function} onComplete - 完成回调函数
 * @param {object} options - 可选参数 { stop: string[], num_predict: number }
 * @param {AbortSignal} signal - AbortSignal 用于取消请求
 * @returns {Promise<string>} - AI 返回的处理后的文本
 */
async function callOllamaAPI(prompt, onChunk, onComplete, options = {}, signal) {
    // Ollama 使用简单格式，需要包含模板和待处理文本
    const fullPrompt = aiConfig.aiPromptTemplate + '\n待处理文本：' + prompt;
    const requestBody = {
        model: aiConfig.providers.ollama.model,
        prompt: fullPrompt,
        stream: true
    };

    // 添加 stop 参数（用于测试时快速中断）
    if (options.stop && Array.isArray(options.stop)) {
        requestBody.stop = options.stop;
    }

    // 添加 num_predict 参数（Ollama 使用 num_predict 代替 max_tokens）
    if (options.num_predict !== undefined) {
        requestBody.num_predict = options.num_predict;
    }

    const response = await fetch(aiConfig.providers.ollama.apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: signal
    });

    if (!response.ok) {
        throw new Error(`Ollama API 请求失败: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Ollama 流式输出返回多行 JSON，每行一个 JSON 对象
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const data = JSON.parse(line);
                if (data.response) {
                    fullText += data.response;
                }
            } catch (e) {
                // 忽略解析失败的行（可能是 JSON 不完整）
            }
        }

        // 实时更新
        if (onChunk) {
            onChunk(fullText);
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

/**
 * 调用智谱 AI API
 * @param {string} prompt - 提示词
 * @param {function} onChunk - 流式输出回调函数
 * @param {function} onComplete - 完成回调函数
 * @param {object} options - 可选参数 { stop: string[], max_tokens: number }
 * @param {AbortSignal} signal - AbortSignal 用于取消请求
 * @returns {Promise<string>} - AI 返回的完整文本
 */
async function callZhipuAPI(prompt, onChunk, onComplete, options = {}, signal) {
    const apiKey = aiConfig.providers.zhipu.apiKey;
    const model = aiConfig.providers.zhipu.model || 'glm-4-flash-250414';

    const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const requestBody = {
        model: model,
        messages: [
            { role: "system", content: aiConfig.aiPromptTemplate },
            { role: "user", content: prompt }
        ],
        stream: true,
        max_tokens: options.max_tokens || 1024,
        temperature: 0.3,
        thinking: { type: "disabled" }  // 智谱 AI 特有参数
    };

    // 添加 stop 参数（用于测试时快速中断）
    if (options.stop && Array.isArray(options.stop)) {
        requestBody.stop = options.stop;
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: signal
    });

    if (!response.ok) {
        throw new Error(`智谱 API 请求失败: ${response.status}`);
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

/**
 * 调用阿里心流 API
 * @param {string} prompt - 提示词
 * @param {function} onChunk - 流式输出回调函数
 * @param {function} onComplete - 完成回调函数
 * @param {object} options - 可选参数 { stop: string[], max_tokens: number }
 * @param {AbortSignal} signal - AbortSignal 用于取消请求
 * @returns {Promise<string>} - AI 返回的完整文本
 */
async function callIFlowAPI(prompt, onChunk, onComplete, options = {}, signal) {
    const apiKey = aiConfig.providers.iflow.apiKey;
    const model = aiConfig.providers.iflow.model || 'qwen3-max';

    const apiUrl = 'https://apis.iflow.cn/v1/chat/completions';
    const requestBody = {
        model: model,
        messages: [
            { role: "system", content: aiConfig.aiPromptTemplate },
            { role: "user", content: prompt }
        ],
        stream: true,
        max_tokens: options.max_tokens || 1024,
        temperature: 0.3
    };

    // 添加 stop 参数（用于测试时快速中断）
    if (options.stop && Array.isArray(options.stop)) {
        requestBody.stop = options.stop;
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: signal
    });

    if (!response.ok) {
        throw new Error(`阿里心流 API 请求失败: ${response.status}`);
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

/**

 * 测试 AI 连接（复用 AI 调用函数）

 * @param {string} provider - 提供商：'zhipu' | 'iflow' | 'ollama'

 * @param {boolean} silent - 静默模式，不显示 Toast（用于页面加载预热）

 * @returns {Promise<boolean>}

 */

async function testAIConnection(provider, silent = false) {

    // 如果有真实 AI 处理正在运行，跳过测试
    if (window.isAIProcessingRunning) {
        console.log('AI 处理正在进行中，跳过测试');
        return;
    }

    // 取消正在进行的请求（预热或之前的测试）
    if (window.aiRequestAbortController) {
        window.aiRequestAbortController.abort();
        console.log('已取消正在进行的 AI 请求');
    }

    // 创建新的 AbortController
    window.aiRequestAbortController = new AbortController();

    const testPrompt = '测试';
    let receivedData = false;
    const actionType = silent ? '预热' : '测试';
    console.log(`[${actionType}开始] ${provider}`);



    // 临时保存当前的提示词模板

    const originalPromptTemplate = aiConfig.aiPromptTemplate;



    // 使用简短的测试提示词

    aiConfig.aiPromptTemplate = '你是一个测试助手，请回复"测试成功"';



    // 设置测试运行标志

    window.isAITestRunning = true;



    // 触发测试开始事件

    EventBus.emit('ai:test:start', provider);



    // 只在非静默模式下显示 Toast

    if (!silent) {

        showToast('正在测试 AI 连接...', 'info', false);

    }



    try {



            if (provider === 'ollama') {



                await callOllamaAPI(testPrompt,



                    (chunk) => { receivedData = true; },



                    (fullText) => { /* 完成，无需处理 */ },



                    {},



                    window.aiRequestAbortController.signal



                );



            } else if (provider === 'zhipu') {



                await callZhipuAPI(testPrompt,



                    (chunk) => { receivedData = true; },



                    (fullText) => { /* 完成，无需处理 */ },



                    {},



                    window.aiRequestAbortController.signal



                );



            } else if (provider === 'iflow') {



                await callIFlowAPI(testPrompt,



                    (chunk) => { receivedData = true; },



                    (fullText) => { /* 完成，无需处理 */ },



                    {},



                    window.aiRequestAbortController.signal



                );



                



                            } else {



                                throw new Error('未知的提供商: ' + provider);



                            }



                



                        if (!receivedData) {



                            throw new Error('AI 无响应');



                        }



        console.log(`[${actionType}成功] ${provider}`);

        // 触发测试成功事件

        EventBus.emit('ai:test:success', provider);



        // 只在非静默模式下显示成功 Toast

        if (!silent) {

            showToast('AI 连接测试成功', 'success');

        }



        return true;

    } catch (error) {

        console.log(`[${actionType}失败] ${provider}`, error);

        // 触发测试失败事件

        EventBus.emit('ai:test:failed', provider, error);



        // 只在非静默模式下显示失败 Toast

        if (!silent) {

            showToast('AI 连接测试失败: ' + error.message, 'error');

        }

        throw error;

    } finally {
        console.log(`[${actionType}结束] ${provider}`);

        // 恢复原始的提示词模板
        aiConfig.aiPromptTemplate = originalPromptTemplate;

        // 重置测试运行标志
        window.isAITestRunning = false;

        // 清理 AbortController
        window.aiRequestAbortController = null;

        // 触发测试结束事件
        EventBus.emit('ai:test:end', provider);
    }

}
