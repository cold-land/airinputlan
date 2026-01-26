// AI配置（全内存运行）
const DEFAULT_AI_CONFIG = {
    aiCorrectionMode: 'manual', // 'manual' 或 'auto'
    aiProvider: 'online',       // 'local' 或 'online'（默认在线）
    
    // 本地 AI 配置（Ollama）
    localApiUrl: 'http://localhost:11434/api/generate',
    localModel: 'qwen3:0.6b',
    
    // 在线 AI 配置
    onlineProvider: 'zhipu',    // 在线提供商：'zhipu' / 'openai' 等
    onlineApiKey: '',
    onlineModel: 'glm-4.7-flash',
    
    // 通用配置
    aiPromptTemplate: '你是专业的语音识别文本修正助手，核心逻辑是先理解整句话的语义和使用场景，再针对性修正语音转文字的错误，仅输出修正后的纯文本，不要任何额外解释、标点或备注。\n严格遵循以下通用修正规则：\n1. 语义优先：基于整句话的语境和语义，判断并修正语音误听的同音字、错字、漏字、多字，尤其是技术场景的词汇（如英文/数字组合、专业术语）；\n2. 保留核心：完全保留原句的数字、英文词汇、专有名词、核心语义和基本句式，仅修正错误，不增删、不改写原意；\n3. 清理口语：移除无意义的语气词（嗯、啊、呢、吧、哦、呃、然后）、重复词汇（如我们我们、的的）、多余的无意义单字；\n4. 规范格式：修正英文/技术词汇间的标点错误（如逗号换空格）、重复标点，保持原句整体标点和句式结构基本不变；\n5. 拼写修正：基于语义修正技术词汇的字母重复、漏写、错写问题，还原正确的英文专业词汇。'
};

let aiConfig = { ...DEFAULT_AI_CONFIG };

// 导出AI配置
function exportAIConfig() {
    const configJson = JSON.stringify(aiConfig, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'airinputlan-ai-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 导入AI配置
function importAIConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);
                // 验证配置项
                if (typeof config.aiCorrectionMode === 'string' &&
                            typeof config.ollamaApiUrl === 'string' &&
                            typeof config.ollamaModel === 'string' &&
                            typeof config.aiPromptTemplate === 'string') {
                            aiConfig = config;
                        } else {
                            alert('配置文件格式错误！');
                }
            } catch (error) {
                alert('配置文件解析失败！');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 保存AI配置（从配置界面）
function saveAIConfig() {
    const mode = document.querySelector('input[name="ai-mode"]:checked')?.value || 'manual';
    const provider = document.querySelector('input[name="ai-provider"]:checked')?.value || 'online';
    const prompt = document.getElementById('ai-prompt').value.trim();

    if (!prompt) {
        alert('请填写所有配置项！');
        return;
    }

    // 根据提供商保存不同的配置
    if (provider === 'local') {
        const localApiUrl = document.getElementById('ai-local-api-url').value.trim();
        const localModel = document.getElementById('ai-local-model').value.trim();

        if (!localApiUrl || !localModel) {
            alert('请填写本地 AI 配置项！');
            return;
        }

        aiConfig = {
            aiCorrectionMode: mode,
            aiProvider: 'local',
            localApiUrl: localApiUrl,
            localModel: localModel,
            onlineProvider: aiConfig.onlineProvider,
            onlineApiKey: aiConfig.onlineApiKey,
            onlineModel: aiConfig.onlineModel,
            aiPromptTemplate: prompt
        };
    } else {
        const onlineProvider = document.getElementById('ai-online-provider').value;
        const onlineApiKey = document.getElementById('ai-online-api-key').value.trim();
        const onlineModel = document.getElementById('ai-online-model').value.trim();

        if (!onlineApiKey) {
            alert('请填写在线 AI API Key！');
            return;
        }

        aiConfig = {
            aiCorrectionMode: mode,
            aiProvider: 'online',
            localApiUrl: aiConfig.localApiUrl,
            localModel: aiConfig.localModel,
            onlineProvider: onlineProvider,
            onlineApiKey: onlineApiKey,
            onlineModel: onlineModel,
            aiPromptTemplate: prompt
        };
    }

    closeAISettingsModal();
}

// 更新AI修正按钮状态
function updateAICorrectionButton() {
    const button = document.getElementById('ai-correction-toggle');
    if (button) {
        button.textContent = '🤖 AI修正';
    }
}

// 打开AI设置模态框
function openAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (!modal) return;

    // 填充当前配置
    document.getElementById('ai-mode-manual').checked = aiConfig.aiCorrectionMode === 'manual';
    document.getElementById('ai-mode-auto').checked = aiConfig.aiCorrectionMode === 'auto';
    
    // AI 提供商
    document.getElementById('ai-provider-local').checked = aiConfig.aiProvider === 'local';
    document.getElementById('ai-provider-online').checked = aiConfig.aiProvider === 'online';
    
    // 本地 AI 配置
    document.getElementById('ai-local-api-url').value = aiConfig.localApiUrl;
    document.getElementById('ai-local-model').value = aiConfig.localModel;
    
    // 在线 AI 配置
    document.getElementById('ai-online-provider').value = aiConfig.onlineProvider;
    document.getElementById('ai-online-api-key').value = aiConfig.onlineApiKey;
    document.getElementById('ai-online-model').value = aiConfig.onlineModel;
    
    // 通用配置
    document.getElementById('ai-prompt').value = aiConfig.aiPromptTemplate;

    // 根据提供商显示/隐藏配置区
    toggleAIProviderConfig();

    modal.classList.remove('hidden');
}

// 切换 AI 提供商配置显示
function toggleAIProviderConfig() {
    const provider = document.querySelector('input[name="ai-provider"]:checked')?.value || 'online';
    const localConfig = document.getElementById('ai-local-config');
    const onlineConfig = document.getElementById('ai-online-config');

    if (provider === 'local') {
        localConfig.classList.remove('hidden');
        onlineConfig.classList.add('hidden');
    } else {
        localConfig.classList.add('hidden');
        onlineConfig.classList.remove('hidden');
    }
}

// 关闭AI设置模态框
function closeAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}