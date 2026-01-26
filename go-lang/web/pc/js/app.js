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
}

// HTML 转义函数，防止 XSS 攻击
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 检测重复字并高亮
// 注意：此函数使用 innerHTML 插入内容，但所有用户输入都已通过 escapeHtml() 转义
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

// 初始化
function init() {
    console.log('初始化...');

    // 清空所有内容
    document.getElementById('history-cards').innerHTML = '';
    document.getElementById('current-input').textContent = '';

    loadServerInfo();
    setupEventSource();
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
        generateQRCode(ipsData.ips, portData.port);
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
function generateQRCode(ips, port) {
    if (ips && ips.length > 0) {
        // 使用第一个IP（已按优先级排序：以太网 > USB共享网卡 > WiFi）
        const selectedIP = ips[0];
        generateQRCodeForIP(selectedIP.ip, port);
    }
}

// 根据指定IP生成二维码
function generateQRCodeForIP(ip, port) {
    const container = document.getElementById('qr-code');
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
            console.log('收到 message 事件:', data);
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
    console.log('处理消息:', message);

    if (message.type === 'text') {
        // 收到文本消息：直接更新底部输入区
        console.log('收到文本消息:', message.data);
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
    console.log('更新输入区，内容长度:', text.length);

    // 清除之前的定时器
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    // 防抖：50ms 后更新
    updateTimeout = setTimeout(() => {
        console.log('执行 DOM 更新');
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
    aiButton.style.display = aiConfig.aiCorrectionEnabled ? 'block' : 'none';
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
        copyToClipboard(currentText);
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

    return cardWrapper;
}

// AI修正卡片
async function correctCardWithAI(cardWrapper) {
    const card = cardWrapper.querySelector('.card');
    const originalText = card.dataset.originalText;
    if (!originalText) {
        alert('没有可修正的文本！');
        return;
    }

    const aiButton = cardWrapper.querySelector('.ai-correct-button');
    const cardContent = card.querySelector('.card-content');

    // 显示加载状态
    aiButton.textContent = '⏳';
    aiButton.disabled = true;
    const originalContent = cardContent.innerHTML;
    cardContent.innerHTML = '<span style="color: #999;">正在修正...</span>';

    try {
        // 构建提示词（自动追加待修正文本）
        const prompt = aiConfig.aiPromptTemplate + '\n\n待修正文本：' + originalText;

        // 调用Ollama API
        const response = await fetch(aiConfig.ollamaApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: aiConfig.ollamaModel,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.0,
                    top_p: 1.0,
                    num_ctx: 2048
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const fixedText = data.response;

        if (!fixedText || fixedText.trim() === '') {
            throw new Error('AI返回空结果');
        }

        // 更新卡片内容
        card.dataset.originalText = fixedText;
        cardContent.innerHTML = highlightDuplicates(fixedText);
        copyToClipboard(fixedText);
    } catch (error) {
        console.error('AI修正失败:', error);
        alert(`AI修正失败：${error.message}\n请检查Ollama服务是否正常运行`);
        // 恢复原始内容
        cardContent.innerHTML = originalContent;
    } finally {
        // 恢复按钮状态
        aiButton.textContent = '🤖';
        aiButton.disabled = false;
    }
}

// 进入编辑模式
function enterEditMode(card, originalText) {
    card.classList.add('editing');

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
        if (newText && newText !== originalText) {
            // 更新卡片内容（带高亮）
            cardContent.innerHTML = highlightDuplicates(newText);
            // 更新 data-original-text 属性
            card.dataset.originalText = newText;
            copyToClipboard(newText);
        } else {
            // 恢复原始内容（带高亮）
            cardContent.innerHTML = highlightDuplicates(originalText);
        }
        card.classList.remove('editing');
    };

    textarea.onblur = confirmEdit;
    textarea.onkeydown = (e) => {
        if (e.key === 'Escape') {
            cardContent.innerHTML = highlightDuplicates(originalText);
            card.classList.remove('editing');
        }
    };
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        console.error('复制失败:', err);
    });
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