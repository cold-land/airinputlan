// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的 Promise 拒绝:', event.reason);
});

// 状态
let isConnected = false;
let eventSource = null;
let reconnectInterval = null;
let updateTimeout = null; // 防抖定时器

// 主题切换
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    const button = document.querySelector('.theme-toggle');
    button.textContent = isDark ? '☀️ 切换主题' : '🌙 切换主题';

    // 保存主题到 Local Storage
    saveTheme(isDark ? 'dark' : 'light');
}

// 加载服务器信息
async function loadServerInfo() {
    const ipList = document.getElementById('ip-list');
    const portInfo = document.getElementById('port-info');

    // 显示加载状态
    ipList.innerHTML = '加载中...';
    portInfo.innerHTML = '加载中...';

    try {
        const [ipsRes, portRes] = await Promise.all([
            fetch('/api/ip'),
            fetch('/api/port')
        ]);

        const ipsData = await ipsRes.json();
        const portData = await portRes.json();

        console.log('========== 服务器信息 ==========');
        console.log('IP数据:', ipsData);
        console.log('IP数量:', ipsData.ips ? ipsData.ips.length : 0);
        console.log('端口数据:', portData);
        console.log('================================');

        displayIPs(ipsData.ips);
        displayPort(portData.port);
        generateQRCodeForIP(ipsData.ips, portData.port);
    } catch (error) {
        ipList.innerHTML = '加载失败';
        portInfo.innerHTML = '加载失败';
        console.error('加载服务器信息失败:', error);
    }
}

// 显示 IP 列表
function displayIPs(ips) {
    const container = document.getElementById('ip-list');
    if (ips && ips.length > 0) {
        if (ips.length === 1) {
            // 只有一个IP，直接显示
            container.innerHTML = '';
            const strong = document.createElement('strong');
            strong.textContent = 'IP: ';
            container.appendChild(strong);
            const text = document.createTextNode(ips[0].ip);
            container.appendChild(text);
        } else {
            // 有多个IP，显示所有IP供选择
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            const strong = document.createElement('strong');
            strong.textContent = '检测到多个可用网络，请选择一个：';
            div.appendChild(strong);
            container.appendChild(div);

            const select = document.createElement('select');
            select.id = 'ip-select';
            select.style.width = '100%';
            select.style.padding = '8px';
            select.style.fontSize = '14px';

            // 优先显示第一个IP（已按优先级排序：以太网 > USB共享网卡 > WiFi）
            ips.forEach((ip, index) => {
                const option = document.createElement('option');
                option.value = ip.ip;
                option.selected = index === 0;
                const label = document.createTextNode(`${ip.ip} (${ip.nicType})`);
                option.appendChild(label);
                select.appendChild(option);
            });

            container.appendChild(select);

            // 监听IP选择变化
            document.getElementById('ip-select').addEventListener('change', function() {
                const selectedIP = this.value;
                console.log('用户选择了IP:', selectedIP);
                // 重新生成二维码
                const port = document.getElementById('port-info').textContent.replace('端口: ', '');
                generateQRCodeForIP(selectedIP, port);
            });
        }
    }
}

// 显示端口
function displayPort(port) {
    const portInfo = document.getElementById('port-info');
    portInfo.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = '端口: ';
    portInfo.appendChild(strong);
    const text = document.createTextNode(port);
    portInfo.appendChild(text);
}

// 生成二维码
// 根据IP或IP列表生成二维码
// 支持参数：
// - ipOrIps: 
//   1. 字符串类型（多网卡选择时）: '192.168.1.1'
//   2. IP对象数组: [{ip: '192.168.1.1', nicType: 'ethernet'}, ...]
//   3. 单个IP对象: {ip: '192.168.1.1', nicType: 'ethernet'}
// - port: 端口号
function generateQRCodeForIP(ipOrIps, port) {
    const container = document.getElementById('qr-code');
    
    // 智能判断参数类型
    let ip;
    if (typeof ipOrIps === 'string') {
        // 字符串类型（多网卡选择时传递）
        ip = ipOrIps;
    } else if (Array.isArray(ipOrIps) && ipOrIps.length > 0) {
        // 数组类型（初始化时传递，已按优先级排序：以太网 > USB共享网卡 > WiFi）
        ip = ipOrIps[0].ip;
    } else if (ipOrIps && ipOrIps.ip) {
        // 对象类型
        ip = ipOrIps.ip;
    } else {
        return;
    }
    
    const url = `http://${ip}:${port}`;
    console.log('生成二维码，URL:', url);

    // 使用 QRCode.js 在本地生成二维码
    container.innerHTML = '';  // 清空容器
    new QRCode(container, {
        text: url,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

// 设置 SSE 连接
function setupEventSource() {
    // 先清除旧的定时器，防止累积
    if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
    }

    // 关闭旧的 SSE 连接
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }

    console.log('建立 SSE 连接...');
    // type=pc 表示这是 PC 端连接，允许多个 PC 端同时连接
    // type=pc indicates this is a PC connection, allowing multiple PCs to connect simultaneously
    eventSource = new EventSource('/ws?type=pc');

    eventSource.onopen = () => {
        console.log('SSE 连接已建立');
    };

    eventSource.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            handleMessage(data);
        } catch (error) {
            console.error('解析消息失败:', error);
        }
    });

    eventSource.onerror = () => {
        console.log('连接断开');
        isConnected = false;
        // 断开后显示显控区
        showControlPanel();
        eventSource.close();

        // 5秒后重连
        if (reconnectInterval) clearInterval(reconnectInterval);
        reconnectInterval = setInterval(() => {
            if (!isConnected) {
                console.log('尝试重连...');
                setupEventSource();
            }
        }, 5000);
    };

    eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        console.log('收到 connected 事件:', data);
        isConnected = true;
    });

    eventSource.addEventListener('heartbeat', () => {
        // 心跳响应
    });
}

// 处理消息
function handleMessage(message) {
    if (message.type === 'text') {
        // 收到文本消息：直接更新底部输入区
        updateCurrentInput(message.data);
    } else if (message.type === 'segment') {
        // 收到分段信号（旧逻辑）：把底部内容变成卡片，清空底部
        console.log('收到分段信号（旧逻辑）:', message.data);
        const currentContent = document.getElementById('current-input').textContent;
        if (currentContent) {
            // 检查是否只包含空白字符
            const hasNonSpace = currentContent.trim().length > 0;
            if (hasNonSpace) {
                addCard(currentContent);
            }
            updateCurrentInput('');
        }
    } else if (message.type === 'card') {
        // 收到卡片消息（新逻辑）：直接生成卡片（使用服务端发送的内容）
        console.log('收到卡片消息（新逻辑）:', message.data);
        addCard(message.data);
    } else if (message.type === 'clear_input') {
        // 收到清空输入框信号（新逻辑）：清空底部输入区
        console.log('收到清空输入框信号');
        updateCurrentInput('');
    } else if (message.type === 'show_qr') {
        // 收到二维码显示/隐藏信号
        const showQR = message.data === 'true';
        console.log('收到二维码显示信号:', showQR);
        if (showQR) {
            showControlPanel();
        } else {
            hideControlPanel();
        }
    } else if (message.type === 'connected') {
        // 收到连接成功消息
        console.log('收到连接成功消息');
        hideControlPanel();
    }
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
    cardContent.innerHTML = highlightDuplicates(text);

    card.appendChild(cardContent);

    // 保存原始文本，用于编辑
    card.dataset.originalText = text;

    // 单击复制
    card.onclick = () => {
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

    // 自动模式：显示"正在修正"提示
    // 手动模式：按钮显示加载状态
    if (isAutoMode) {
        // 在卡片右上角添加"正在修正"提示
        const statusSpan = document.createElement('span');
        statusSpan.className = 'ai-correction-status';
        statusSpan.textContent = '🤖 正在修正...';
        statusSpan.style.cssText = 'position: absolute; top: 5px; right: 5px; font-size: 12px; color: #999;';
        cardWrapper.style.position = 'relative';
        cardWrapper.appendChild(statusSpan);
    } else {
        aiButton.textContent = '⏳';
        aiButton.disabled = true;
    }
    const originalContent = cardContent.innerHTML;
    cardContent.innerHTML = '<span style="color: #999;">正在修正...</span>';

    try {
        // 构建提示词（只包含待处理文本）
        const prompt = '待处理文本：' + originalText;

        let fixedText;

        // 根据提供商选择调用不同的 API
        if (aiConfig.provider === 'ollama') {
            // Ollama API 使用流式输出
            await callOllamaAPI(prompt,
                // onChunk - 实时更新卡片内容
                (chunk) => {
                    // 只有当有内容时才更新，避免卡片被清空
                    if (chunk && chunk.trim()) {
                        cardContent.innerHTML = highlightDuplicates(chunk);
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
                    cardContent.innerHTML = highlightDuplicates(chunk);
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
                    cardContent.innerHTML = highlightDuplicates(chunk);
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

        // 移除"正在修正"提示
        if (isAutoMode) {
            const statusSpan = cardWrapper.querySelector('.ai-correction-status');
            if (statusSpan) {
                statusSpan.remove();
            }
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
            cardContent.innerHTML = highlightDuplicates(originalText);
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