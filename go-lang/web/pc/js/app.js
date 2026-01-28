// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的 Promise 拒绝:', event.reason);
});

// 防抖定时器
let updateTimeout = null;

// 主题切换
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    const button = document.querySelector('.theme-toggle');
    button.textContent = isDark ? '☀️ 切换主题' : '🌙 切换主题';

    // 保存主题到 Local Storage
    saveTheme(isDark ? 'dark' : 'light');
}

// 添加卡片
function addCard(text) {
    console.log('添加卡片:', text);
    const container = document.getElementById('history-cards');
    const card = createCard(text);
    container.appendChild(card);

    // 限制卡片数量
    while (container.children.length > 50) {
        container.removeChild(container.firstChild);
    }

    // 滚动到底部
    container.scrollTop = container.scrollHeight;

    // 触发 card:added 事件
    EventBus.emit('card:added', card, text);
}

// 创建卡片
function createCard(text) {
    // 创建卡片包装器
    const cardWrapper = document.createElement('div');
    cardWrapper.style.display = 'flex';
    cardWrapper.style.alignItems = 'center';
    cardWrapper.style.gap = '10px';
    cardWrapper.style.marginBottom = '16px';

    // AI修正按钮（仅在启用时显示）- 放在卡片外面
    const aiButton = document.createElement('button');
    aiButton.className = 'ai-correct-button';
    aiButton.textContent = '🤖';
    aiButton.title = 'AI修正';
    // AI 按钮始终显示
    aiButton.style.display = 'block';
    aiButton.onclick = (e) => {
        e.stopPropagation();
        correctCardWithAI(cardWrapper);
    };

    // 创建卡片
    const card = document.createElement('div');
    card.className = 'card';
    card.style.flex = '1';
    card.style.marginBottom = '0';

    // 卡片内容
    const cardContent = document.createElement('div');
    cardContent.className = "card-content";
    cardContent.innerHTML = renderCardContent(text, aiConfig.aiPromptTemplateId);

    card.appendChild(cardContent);

    // 保存原始文本，用于编辑
    card.dataset.originalText = text;

    // 单击复制
    card.onclick = () => {
        // 如果卡片处于编辑模式，不执行复制
        if (card.classList.contains('editing')) {
            return;
        }
        const currentText = card.dataset.originalText || card.textContent;
        copyToBrowser(currentText);
        card.classList.add('copied');
        setTimeout(() => card.classList.remove('copied'), 500);
    };

    // 双击编辑
    card.ondblclick = () => {
        const currentText = card.dataset.originalText || card.textContent;
        enterEditMode(card, currentText);
    };

    // 将AI按钮和卡片添加到包装器
    cardWrapper.appendChild(aiButton);
    cardWrapper.appendChild(card);

    // 触发 card:created 事件
    EventBus.emit('card:created', card, text);

    return cardWrapper;
}

// AI修正卡片
async function correctCardWithAI(cardWrapper, isAutoMode = false) {
    const card = cardWrapper.querySelector('.card');
    const originalText = card.dataset.originalText;
    if (!originalText) {
        if (!isAutoMode) {
            showToast('没有可修正的文本！', 'warning', true);
        }
        return;
    }

    const aiButton = cardWrapper.querySelector('.ai-correct-button');
    const cardContent = card.querySelector('.card-content');

    // 如果有 AI 请求正在进行，提示用户并返回
    if (window.isAITestRunning || window.isAIProcessingRunning) {
        showToast('AI 请求正在进行中，请稍候', 'info', true);
        return;
    }

    // 取消正在进行的请求（理论上不应该有）
    if (window.aiRequestAbortController) {
        window.aiRequestAbortController.abort();
        console.log('已取消正在进行的 AI 请求');
    }

    // 创建新的 AbortController
    window.aiRequestAbortController = new AbortController();

    // 双重检查：再次确认没有其他请求正在进行（防止竞态条件）
    if (window.isAIProcessingRunning) {
        console.log('检测到竞态条件，放弃当前请求');
        window.aiRequestAbortController = null;
        if (!isAutoMode) {
            aiButton.textContent = '🤖';
            aiButton.disabled = false;
        }
        return;
    }

    // 设置 AI 修正运行标志
    window.isAIProcessingRunning = true;

    // 触发 ai:process:start 事件
    EventBus.emit('ai:process:start', card, originalText);

    // 手动模式：按钮显示加载状态
    if (!isAutoMode) {
        aiButton.textContent = '⏳';
        aiButton.disabled = true;
    }
    const originalContent = cardContent.innerHTML;
    cardContent.innerHTML = '<span style="color: #999;">⏳AI正在处理...</span>';

    try {
        // 构建提示词
        let prompt;
        if (aiConfig.aiPromptTemplateId === 'empty') {
            // 空模板：不添加前缀，直接使用原文
            prompt = originalText;
        } else {
            // 其他模板：添加提示词模板和前缀
            prompt = aiConfig.aiPromptTemplate + '\n\n待处理文本：' + originalText;
        }

        let fixedText;

        // 根据提供商选择调用不同的 API
        if (aiConfig.provider === 'ollama') {
            // Ollama API 使用流式输出
            await callOllamaAPI(prompt,
                // onChunk - 实时更新卡片内容
                (chunk) => {
                    // 只有当有内容时才更新，避免卡片被清空
                    if (chunk && chunk.trim()) {
                        cardContent.innerHTML = renderCardContent(chunk, aiConfig.aiPromptTemplateId);
                    }
                },
                // onComplete - 流式输出完成
                (fullText) => {
                    if (!fullText || fullText.trim() === '') {
                        throw new Error('AI返回空结果');
                    }
                    card.dataset.originalText = fullText;

                    // 触发 ai:process:completed 事件
                    EventBus.emit('ai:process:completed', card, fullText);
                },
                {},
                window.aiRequestAbortController.signal
            );
        } else if (aiConfig.provider === 'iflow') {
            // Iflow API 使用流式输出
            await callIFlowAPI(prompt,
                // onChunk - 实时更新卡片内容
                (chunk) => {
                    cardContent.innerHTML = renderCardContent(chunk, aiConfig.aiPromptTemplateId);
                },
                // onComplete - 流式输出完成
                (fullText) => {
                    if (!fullText || fullText.trim() === '') {
                        throw new Error('AI返回空结果');
                    }
                    card.dataset.originalText = fullText;

                    // 触发 ai:process:completed 事件
                    EventBus.emit('ai:process:completed', card, fullText);
                },
                {},
                window.aiRequestAbortController.signal
            );
        } else {
            // 默认智谱 AI
            await callZhipuAPI(prompt,
                // onChunk - 实时更新卡片内容
                (chunk) => {
                    cardContent.innerHTML = renderCardContent(chunk, aiConfig.aiPromptTemplateId);
                },
                // onComplete - 流式输出完成
                (fullText) => {
                    if (!fullText || fullText.trim() === '') {
                        throw new Error('AI返回空结果');
                    }
                    card.dataset.originalText = fullText;

                    // 触发 ai:process:completed 事件
                    EventBus.emit('ai:process:completed', card, fullText);
                },
                {},
                window.aiRequestAbortController.signal
            );
        }
    } catch (error) {
        console.error('AI修正失败:', error);
        let providerName = '未知';
        if (aiConfig.provider === 'ollama') {
            providerName = 'Ollama';
        } else if (aiConfig.provider === 'iflow') {
            providerName = '阿里心流';
        } else {
            providerName = '清华智谱';
        }
        showToast(`AI修正失败：${error.message}\n请检查${providerName}服务是否正常运行`, 'error', true);
        // 恢复原始内容
        cardContent.innerHTML = originalContent;
    } finally {
        // 重置 AI 修正运行标志
        window.isAIProcessingRunning = false;

        // 清理 AbortController
        window.aiRequestAbortController = null;

        // 恢复按钮状态
        if (!isAutoMode) {
            aiButton.textContent = '🤖';
            aiButton.disabled = false;
        }
    }
}

// 进入编辑模式
function enterEditMode(card, originalText) {
    card.classList.add('editing');

    // 触发卡片进入编辑状态事件
    EventBus.emit('card:edit:start', card, originalText);

    // 获取卡片内容容器
    const cardContent = card.querySelector('.card-content');
    const aiButton = card.querySelector('.ai-correct-button');

    // 创建textarea
    const textarea = document.createElement('textarea');
    textarea.value = originalText;
    textarea.style.width = '100%';
    textarea.style.resize = 'none'; // 禁止手动调整
    textarea.style.fontSize = '14px';
    textarea.style.lineHeight = '1.6';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.backgroundColor = 'transparent';
    textarea.style.overflow = 'hidden'; // 隐藏滚动条

    // 清空卡片内容容器，保留AI按钮
    cardContent.innerHTML = '';
    cardContent.appendChild(textarea);
    textarea.focus();

    // 自适应高度函数
    const autoResize = () => {
        textarea.style.height = 'auto'; // 重置高度
        textarea.style.height = textarea.scrollHeight + 'px'; // 设置为内容高度
    };

    // 初始化时调整高度
    autoResize();

    // 输入时自动调整高度
    textarea.addEventListener('input', autoResize);

    const confirmEdit = () => {
        const newText = textarea.value.trim();
        
        // 保存卡片编辑
        saveCardEdit(card, newText, originalText);
        
        // 如果有修改，复制到剪贴板
        if (newText && newText !== originalText) {
            copyToBrowser(newText);
        }
        
        // 触发卡片退出编辑状态事件
        EventBus.emit('card:edit:end', card, newText, originalText);
    };

    textarea.onblur = confirmEdit;
    textarea.onkeydown = (e) => {
        if (e.key === 'Escape') {
            cardContent.innerHTML = renderCardContent(originalText, aiConfig.aiPromptTemplateId);
            card.classList.remove('editing');
        }
    };
}

// 隐藏显控区
function hideControlPanel() {
    console.log('隐藏显控区');
    document.getElementById('control-panel').classList.add('hidden');
}

// 显示显控区
function showControlPanel() {
    console.log('显示显控区');
    document.getElementById('control-panel').classList.remove('hidden');
}

// 更新当前输入（带防抖）
function updateCurrentInput(text) {
    // 清除之前的定时器
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    // 防抖：50ms 后更新
    updateTimeout = setTimeout(() => {
        document.getElementById('current-input').textContent = text;
    }, 50); // 50ms 防抖
}
