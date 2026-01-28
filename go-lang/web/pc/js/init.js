// 全局状态变量
let isConnected = false;
let eventSource = null;
let reconnectInterval = null;

// AI 配置默认值
const DEFAULT_AI_CONFIG = {
    provider: 'zhipu',           // 'zhipu' | 'iflow' | 'ollama'

    // 统一的提供商配置
    providers: {
        zhipu: {
            apiKey: '',
            model: 'glm-4-flash-250414'
        },
        iflow: {
            apiKey: '',
            model: 'qwen3-max'
        },
        ollama: {
            apiUrl: 'http://localhost:11434/api/generate',
            model: 'qwen3:0.6b'
        }
    },

    // 通用配置
    aiCorrectionMode: 'manual', // 'manual' 或 'auto'
    aiPromptTemplateId: 'default',  // 模板 ID
    aiPromptTemplate: ''  // 从 prompt-templates.json 加载
};

// AI 配置（全内存运行）
let aiConfig = { ...DEFAULT_AI_CONFIG };
let lastTestedConfig = null; // 记录上次测试的配置
let promptTemplates = []; // 提示词模板列表

// 加载主题设置
function loadThemeSettings() {
    const savedTheme = loadTheme();
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        const button = document.querySelector('.theme-toggle');
        if (button) {
            button.textContent = '☀️ 切换主题';
        }
    }
}

// 从 Local Storage 加载 AI 配置
async function loadAISettings() {
    const savedConfig = loadAIConfigFromStorage();
    if (savedConfig) {
        // 检测是否为旧版本配置（有 aiProvider 或 onlineProvider 字段）
        const isOldConfig = savedConfig.aiProvider !== undefined ||
                           savedConfig.onlineProvider !== undefined;

        if (isOldConfig) {
            // 显示配置更新提示
            showConfigUpdatePrompt(savedConfig);
            // 加载默认配置
            aiConfig = { ...DEFAULT_AI_CONFIG };
            console.log('检测到旧版本配置，已加载默认配置');
        } else {
            // 新版本配置，直接加载
            aiConfig = { ...DEFAULT_AI_CONFIG, ...savedConfig };
            console.log('AI 配置已从 Local Storage 加载');
            console.log('加载的配置:', aiConfig);
        }
    } else {
        aiConfig = { ...DEFAULT_AI_CONFIG };
    }

    // 如果 aiPromptTemplate 为空且模板 ID 不是 empty，从 prompt-templates.json 加载默认模板
    if (!aiConfig.aiPromptTemplate && aiConfig.aiPromptTemplateId !== 'empty') {
        try {
            const response = await fetch('/pc/js/prompt-templates.json');
            const data = await response.json();
            const defaultTemplate = data.templates.find(t => t.id === 'default');
            if (defaultTemplate) {
                aiConfig.aiPromptTemplate = defaultTemplate.prompt;
                console.log('已从 prompt-templates.json 加载默认提示词');
            }
        } catch (error) {
            console.error('加载默认提示词失败:', error);
        }
    }
}

// 加载提示词模板
async function loadPromptTemplates() {
    try {
        const response = await fetch('/pc/js/prompt-templates.json');
        const data = await response.json();
        promptTemplates = data.templates || [];

        // 加载自定义模板
        const customTemplates = loadCustomTemplates();
        if (customTemplates.length > 0) {
            promptTemplates = promptTemplates.concat(customTemplates);
            console.log('已加载', customTemplates.length, '个自定义模板');
        }

        // 填充下拉选择框
        const select = document.getElementById('ai-prompt-template');
        if (select) {
            select.innerHTML = '';

            // 添加预设模板
            promptTemplates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name;
                select.appendChild(option);
            });

            // 默认选择
            select.value = aiConfig.aiPromptTemplateId || 'default';
            handlePromptTemplateChange();
        }
    } catch (error) {
        console.error('加载提示词模板失败:', error);
    }
}

// 注册事件监听器
function registerEventListeners() {
    // 监听卡片添加事件 - 自动 AI 修正
    EventBus.on('card:added', (card, text) => {
        if (aiConfig.aiCorrectionMode === 'auto') {
            correctCardWithAI(card, true);
        }
    });

    // 监听 AI 测试开始事件
    EventBus.on('ai:test:start', (provider) => {
        // 事件触发，日志已在 actions.js 中输出
    });

    // 监听 AI 测试结束事件
    EventBus.on('ai:test:end', (provider) => {
        // 事件触发，日志已在 actions.js 中输出
    });

    // 监听 AI 测试成功事件
    EventBus.on('ai:test:success', (provider) => {
        // 事件触发，日志已在 actions.js 中输出
    });

    // 监听 AI 测试失败事件
    EventBus.on('ai:test:failed', (provider, error) => {
        // 事件触发，日志已在 actions.js 中输出
    });

    // 监听 AI 配置取消事件
    EventBus.on('ai:config:cancelled', () => {
        closeAISettingsModal();
    });
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

// 初始化
async function init() {
    console.log('初始化...');

    // 清空所有内容
    document.getElementById('history-cards').innerHTML = '';
    document.getElementById('current-input').textContent = '';

    // 检测 Local Storage 是否可用
    if (!isLocalStorageAvailable()) {
        showToast('当前处于隐私模式，配置将无法保存', 'warning');
    }

    // 加载主题
    loadThemeSettings();

    // 加载 AI 配置
    await loadAISettings();

    // 注册事件监听器
    registerEventListeners();

    loadServerInfo();
    setupEventSource();

    // 预热 AI 连接（静默模式）
    if (aiConfig.provider) {
        const providerConfig = aiConfig.providers[aiConfig.provider];
        // Ollama 检查 apiUrl，在线 API 检查 apiKey
        const hasValidConfig = aiConfig.provider === 'ollama'
            ? providerConfig?.apiUrl
            : providerConfig?.apiKey;

        if (hasValidConfig) {
            console.log(`[预热开始] ${aiConfig.provider}`);
            testAIConnection(aiConfig.provider, true)  // 静默模式
                .then(() => console.log(`[预热结束] ${aiConfig.provider} [成功]`))
                .catch((error) => console.log(`[预热结束] ${aiConfig.provider} [失败]`, error));
        }
    }
}

// 页面加载完成后启动应用
window.addEventListener('DOMContentLoaded', () => {
    init();

    // 添加提示词模板选择框的事件监听器
    const promptTemplateSelect = document.getElementById('ai-prompt-template');
    if (promptTemplateSelect) {
        promptTemplateSelect.addEventListener('change', handlePromptTemplateChange);
    }
});