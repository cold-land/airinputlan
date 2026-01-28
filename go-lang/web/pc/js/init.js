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
    if (aiConfig.provider && aiConfig.providers[aiConfig.provider]?.apiKey) {
        console.log(`[预热开始] ${aiConfig.provider}`);
        testAIConnection(aiConfig.provider, true)  // 静默模式
            .then(() => console.log(`[预热结束] ${aiConfig.provider} [成功]`))
            .catch((error) => console.log(`[预热结束] ${aiConfig.provider} [失败]`, error));
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