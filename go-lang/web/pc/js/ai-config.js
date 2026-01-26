// AI配置（全内存运行）
const DEFAULT_AI_CONFIG = {
    aiCorrectionEnabled: false,
    ollamaApiUrl: 'http://localhost:11434/api/generate',
    ollamaModel: 'qwen3:0.6b',
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
                if (typeof config.aiCorrectionEnabled === 'boolean' &&
                            typeof config.ollamaApiUrl === 'string' &&
                            typeof config.ollamaModel === 'string' &&
                            typeof config.aiPromptTemplate === 'string') {
                            aiConfig = config;
                            updateAICorrectionButton();
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
    const enabled = document.getElementById('ai-enabled').checked;
    const apiUrl = document.getElementById('ai-api-url').value.trim();
    const model = document.getElementById('ai-model').value.trim();
    const prompt = document.getElementById('ai-prompt').value.trim();

    if (!apiUrl || !model || !prompt) {
        alert('请填写所有配置项！');
        return;
    }

    aiConfig = {
        aiCorrectionEnabled: enabled,
        ollamaApiUrl: apiUrl,
        ollamaModel: model,
        aiPromptTemplate: prompt
    };

    updateAICorrectionButton();
    closeAISettingsModal();
}

// 更新AI修正按钮状态
function updateAICorrectionButton() {
    const button = document.getElementById('ai-correction-toggle');
    if (button) {
        button.textContent = aiConfig.aiCorrectionEnabled ? '🤖 AI修正（已启用）' : '🤖 AI修正';
    }
}

// 打开AI设置模态框
function openAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (!modal) return;

    // 填充当前配置
    document.getElementById('ai-enabled').checked = aiConfig.aiCorrectionEnabled;
    document.getElementById('ai-api-url').value = aiConfig.ollamaApiUrl;
    document.getElementById('ai-model').value = aiConfig.ollamaModel;
    document.getElementById('ai-prompt').value = aiConfig.aiPromptTemplate;

    modal.classList.remove('hidden');
}

// 关闭AI设置模态框
function closeAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}