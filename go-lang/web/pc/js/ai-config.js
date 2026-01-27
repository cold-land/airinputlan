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
    onlineModel: 'glm-4-flash-250414',
    
    // 通用配置
    aiPromptTemplateId: 'default',  // 模板 ID
    aiPromptTemplate: '你是专业的语音识别文本修正助手，核心逻辑是先理解整句话的语义和使用场景，再针对性修正语音转文字的错误，仅输出修正后的纯文本，不要任何额外解释、标点或备注。\n严格遵循以下通用修正规则：\n1. 语义优先：基于整句话的语境和语义，判断并修正语音误听的同音字、错字、漏字、多字，尤其是技术场景的词汇（如英文/数字组合、专业术语）；\n2. 保留核心：完全保留原句的数字、英文词汇、专有名词、核心语义和基本句式，仅修正错误，不增删、不改写原意；\n3. 清理口语：移除无意义的语气词（嗯、啊、呢、吧、哦、呃、然后）、重复词汇（如我们我们、的的）、多余的无意义单字；\n4. 规范格式：修正英文/技术词汇间的标点错误（如逗号换空格）、重复标点，保持原句整体标点和句式结构基本不变；\n5. 拼写修正：基于语义修正技术词汇的字母重复、漏写、错写问题，还原正确的英文专业词汇。'
};

let aiConfig = { ...DEFAULT_AI_CONFIG };
let lastTestedConfig = null; // 记录上次测试的配置
let promptTemplates = []; // 提示词模板列表

// 从 Local Storage 加载 AI 配置
function loadAISettings() {
    const savedConfig = loadAIConfigFromStorage();
    if (savedConfig) {
        aiConfig = { ...DEFAULT_AI_CONFIG, ...savedConfig };
        console.log('AI 配置已从 Local Storage 加载');
    }
}

// 后台预热在线 AI
async function warmupOnlineAI() {
    if (aiConfig.aiProvider === 'online' && aiConfig.onlineApiKey) {
        try {
            await testOnlineAIConfig(aiConfig.onlineApiKey, aiConfig.onlineModel);
            console.log('在线 AI 预热成功');
        } catch (e) {
            console.log('在线 AI 预热失败:', e);
        }
    }
}

// 页面加载时加载配置
window.addEventListener('DOMContentLoaded', () => {
    loadAISettings();
});

// 页面加载完成后预热在线 AI
window.addEventListener('load', () => {
    warmupOnlineAI();
});

// 加载提示词模板
async function loadPromptTemplates() {
    try {
        const response = await fetch('/pc/js/prompt-templates.json');
        const data = await response.json();
        promptTemplates = data.templates || [];
        
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
            
            // 添加"自定义"选项
            const customOption = document.createElement('option');
            customOption.value = 'custom';
            customOption.textContent = '自定义';
            select.appendChild(customOption);
            
            // 默认选择
            select.value = aiConfig.aiPromptTemplateId || 'default';
            handlePromptTemplateChange();
        }
    } catch (error) {
        console.error('加载提示词模板失败:', error);
    }
}

// 处理提示词模板选择变化
function handlePromptTemplateChange() {
    const select = document.getElementById('ai-prompt-template');
    const customTextarea = document.getElementById('ai-prompt');
    
    if (!select || !customTextarea) return;
    
    const selectedValue = select.value;
    
    if (selectedValue === 'custom') {
        // 自定义模式，保持当前内容
        customTextarea.value = aiConfig.aiPromptTemplate;
    } else {
        // 预设模板模式，填充预设内容
        const template = promptTemplates.find(t => t.id === selectedValue);
        if (template) {
            customTextarea.value = template.prompt;
            aiConfig.aiPromptTemplate = template.prompt;
            aiConfig.aiPromptTemplateId = template.id;
        }
    }
}

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

// 测试在线 AI 配置
async function testOnlineAIConfig(apiKey, model) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "user",
                        content: "测试"
                    }
                ],
                max_tokens: 10,
                temperature: 0.0,
                thinking: {
                    type: "disabled"
                },
                stream: true
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
        }

        // 读取流式响应（只需要读取第一个数据块即可）
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const { done, value } = await reader.read();
        
        if (done) {
            throw new Error('AI返回空结果');
        }

        return true;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('连接超时，请检查网络连接');
        }
        throw error;
    }
}

// 保存AI配置（从配置界面）
function saveAIConfig() {
    const mode = document.querySelector('input[name="ai-mode"]:checked')?.value || 'manual';
    const provider = document.querySelector('input[name="ai-provider"]:checked')?.value || 'online';
    const promptTemplateId = document.getElementById('ai-prompt-template').value;
    const customPrompt = document.getElementById('ai-prompt').value.trim();

    // 确定提示词内容
    let prompt = customPrompt;
    let templateId = promptTemplateId;

    if (promptTemplateId !== 'custom') {
        // 使用预设模板
        const template = promptTemplates.find(t => t.id === promptTemplateId);
        if (template) {
            prompt = template.prompt;
        }
    } else {
        // 使用自定义提示词
        if (!prompt) {
            return;
        }
    }

    // 根据提供商保存不同的配置
    if (provider === 'local') {
        const localApiUrl = document.getElementById('ai-local-api-url').value.trim();
        const localModel = document.getElementById('ai-local-model').value.trim();

        if (!localApiUrl || !localModel) {
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
            aiPromptTemplateId: templateId,
            aiPromptTemplate: prompt
        };

        // 立即关闭窗口
        closeAISettingsModal();

        // 保存到 Local Storage
        saveAIConfigToStorage(aiConfig);

        // 显示成功提示
        showToast('配置已保存', 'success');
    } else {
        const onlineProvider = document.getElementById('ai-online-provider').value;
        const onlineApiKey = document.getElementById('ai-online-api-key').value.trim();
        const onlineModel = document.getElementById('ai-online-model').value.trim();

        if (!onlineApiKey) {
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
            aiPromptTemplateId: templateId,
            aiPromptTemplate: prompt
        };

        // 立即关闭窗口
        closeAISettingsModal();

        // 保存到 Local Storage
        saveAIConfigToStorage(aiConfig);

        // 显示"正在检测"提示
        showToast('正在检测 AI 连接...', 'info', false);

        // 在线 AI：测试握手
        testOnlineAIConfig(onlineApiKey, onlineModel).then(() => {
            // 测试成功，记录配置
            lastTestedConfig = {
                aiProvider: 'online',
                onlineProvider: onlineProvider,
                onlineApiKey: onlineApiKey,
                onlineModel: onlineModel
            };
            // 更新提示为成功
            updateToast('配置已保存', 'success');
        }).catch((error) => {
            console.error('配置验证失败:', error);
            // 更新提示为失败
            updateToast('连接失败，请检查配置', 'error');
        });
    }
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
    document.getElementById('ai-provider-online').checked = aiConfig.aiProvider === 'online';
    document.getElementById('ai-provider-local').checked = aiConfig.aiProvider === 'local';

    // 本地 AI 配置
    document.getElementById('ai-local-api-url').value = aiConfig.localApiUrl;
    document.getElementById('ai-local-model').value = aiConfig.localModel;

    // 在线 AI 配置
    document.getElementById('ai-online-provider').value = aiConfig.onlineProvider;
    document.getElementById('ai-online-api-key').value = aiConfig.onlineApiKey;

    // 模型选择框事件监听
    const modelSelect = document.getElementById('ai-online-model-select');
    const modelInput = document.getElementById('ai-online-model');
    if (modelSelect && modelInput) {
        // 设置输入框的值（使用小写）
        modelInput.value = aiConfig.onlineModel || 'glm-4-flash-250414';

        // 设置选择框的值
        modelSelect.value = aiConfig.onlineModel || 'glm-4-flash-250414';

        // 选择框变化时，更新输入框
        modelSelect.onchange = function() {
            if (this.value) {
                modelInput.value = this.value;
            }
        };

        // 输入框变化时，更新选择框
        modelInput.oninput = function() {
            // 检查输入的值是否在下拉选项中
            let found = false;
            for (let option of modelSelect.options) {
                if (option.value === this.value) {
                    modelSelect.value = this.value;
                    found = true;
                    break;
                }
            }
            if (!found) {
                modelSelect.value = '';
            }
        };
    }

    // 通用配置
    document.getElementById('ai-prompt').value = aiConfig.aiPromptTemplate;

    // 加载提示词模板
    loadPromptTemplates().then(() => {
        // 填充下拉选择框
        const select = document.getElementById('ai-prompt-template');
        if (select) {
            select.value = aiConfig.aiPromptTemplateId || 'default';
            handlePromptTemplateChange();
        }
    });

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