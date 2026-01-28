// AI配置（全内存运行）
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
    aiPromptTemplate: '你是专业的语音识别文本修正助手，核心逻辑是先理解整句话的语义和使用场景，再针对性修正语音转文字的错误，仅输出修正后的纯文本，不要任何额外解释、标点或备注。\n严格遵循以下通用修正规则：\n1. 语义优先：基于整句话的语境和语义，判断并修正语音误听的同音字、错字、漏字、多字，尤其是技术场景的词汇（如英文/数字组合、专业术语）；\n2. 保留核心：完全保留原句的数字、英文词汇、专有名词、核心语义和基本句式，仅修正错误，不增删、不改写原意；\n3. 清理口语：移除无意义的语气词（嗯、啊、呢、吧、哦、呃、然后）、重复词汇（如我们我们、的的）、多余的无意义单字；\n4. 规范格式：修正英文/技术词汇间的标点错误（如逗号换空格）、重复标点，保持原句整体标点和句式结构基本不变；\n5. 拼写修正：基于语义修正技术词汇的字母重复、漏写、错写问题，还原正确的英文专业词汇。'
};

let aiConfig = { ...DEFAULT_AI_CONFIG };
let lastTestedConfig = null; // 记录上次测试的配置
let promptTemplates = []; // 提示词模板列表

// 从 Local Storage 加载 AI 配置
function loadAISettings() {
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
}

// 处理在线提供商切换
function handleOnlineProviderChange() {
    const provider = document.getElementById('ai-online-provider').value;
    const apiKeyInput = document.getElementById('ai-online-api-key');
    const modelInput = document.getElementById('ai-online-model');
    const modelSelect = document.getElementById('ai-online-model-select');

    // 保存当前提供商的配置
    const currentProvider = aiConfig.onlineProvider;
    if (currentProvider && apiKeyInput && modelInput) {
        if (!aiConfig.onlineApiKeys) {
            aiConfig.onlineApiKeys = {};
        }
        if (!aiConfig.onlineModels) {
            aiConfig.onlineModels = {};
        }
        aiConfig.onlineApiKeys[currentProvider] = apiKeyInput.value;
        aiConfig.onlineModels[currentProvider] = modelInput.value;
    }

    // 更新当前提供商
    aiConfig.onlineProvider = provider;

    // 根据提供商更新模型下拉框选项
    modelSelect.innerHTML = '<option value="">选择模型...</option>';

    if (provider === 'iflow') {
        // 阿里心流模型
        modelSelect.innerHTML += '<option value="iflow-rome-30ba3b">iFlow-ROME</option>';
        modelSelect.innerHTML += '<option value="qwen3-max">Qwen3-Max</option>';
        modelSelect.innerHTML += '<option value="kimi-k2" selected>Kimi-K2</option>';
        modelSelect.innerHTML += '<option value="deepseek-v3">DeepSeek-V3-671B</option>';
    } else {
        // 清华智谱模型
        modelSelect.innerHTML += '<option value="glm-4-flash-250414" selected>GLM-4-Flash-250414</option>';
        modelSelect.innerHTML += '<option value="glm-4.7-flash">GLM-4.7-Flash</option>';
    }

    // 加载新提供商的配置
    if (aiConfig.onlineApiKeys && aiConfig.onlineApiKeys[provider]) {
        apiKeyInput.value = aiConfig.onlineApiKeys[provider];
    } else {
        apiKeyInput.value = '';
    }

    if (aiConfig.onlineModels && aiConfig.onlineModels[provider]) {
        modelInput.value = aiConfig.onlineModels[provider];
        modelSelect.value = aiConfig.onlineModels[provider];
    } else {
        // 根据提供商设置默认模型
        if (provider === 'iflow') {
            modelInput.value = 'qwen3-max';
            modelSelect.value = 'qwen3-max';
        } else {
            modelInput.value = 'glm-4-flash-250414';
            modelSelect.value = 'glm-4-flash-250414';
        }
    }
}

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

// 导出配置
function exportAIConfig() {
    const config = {
        aiConfig: aiConfig,
        theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light'
    };
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'airinputlan-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('配置已导出', 'success');
}

// 导入配置
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
                const data = JSON.parse(event.target.result);

                // 支持两种格式：直接是配置，或包含 aiConfig 字段
                const config = data.aiConfig || data;

                // 只提取新版本需要的字段，丢弃其他字段
                const filteredConfig = {
                    provider: 'zhipu',  // 默认值
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
                    aiCorrectionMode: 'manual',
                    aiPromptTemplateId: 'default',
                    aiPromptTemplate: DEFAULT_AI_CONFIG.aiPromptTemplate
                };

                // 提取通用字段
                if (config.aiCorrectionMode) {
                    filteredConfig.aiCorrectionMode = config.aiCorrectionMode;
                }
                if (config.aiPromptTemplateId) {
                    filteredConfig.aiPromptTemplateId = config.aiPromptTemplateId;
                }
                if (config.aiPromptTemplate) {
                    filteredConfig.aiPromptTemplate = config.aiPromptTemplate;
                }

                // 从旧配置提取智谱 API Key 和模型
                if (config.onlineApiKeys?.zhipu !== undefined) {
                    filteredConfig.providers.zhipu.apiKey = config.onlineApiKeys.zhipu;
                }
                if (config.onlineModels?.zhipu) {
                    filteredConfig.providers.zhipu.model = config.onlineModels.zhipu;
                }

                // 从新配置提取智谱 API Key 和模型
                if (config.providers?.zhipu?.apiKey !== undefined) {
                    filteredConfig.providers.zhipu.apiKey = config.providers.zhipu.apiKey;
                }
                if (config.providers?.zhipu?.model) {
                    filteredConfig.providers.zhipu.model = config.providers.zhipu.model;
                }

                // 从旧配置提取心流 API Key 和模型
                if (config.onlineApiKeys?.iflow !== undefined) {
                    filteredConfig.providers.iflow.apiKey = config.onlineApiKeys.iflow;
                }
                if (config.onlineModels?.iflow) {
                    filteredConfig.providers.iflow.model = config.onlineModels.iflow;
                }

                // 从新配置提取心流 API Key 和模型
                if (config.providers?.iflow?.apiKey !== undefined) {
                    filteredConfig.providers.iflow.apiKey = config.providers.iflow.apiKey;
                }
                if (config.providers?.iflow?.model) {
                    filteredConfig.providers.iflow.model = config.providers.iflow.model;
                }

                // 从旧配置提取 Ollama 配置
                if (config.localApiUrl) {
                    filteredConfig.providers.ollama.apiUrl = config.localApiUrl;
                }
                if (config.localModel) {
                    filteredConfig.providers.ollama.model = config.localModel;
                }

                // 从新配置提取 Ollama 配置
                if (config.providers?.ollama?.apiUrl) {
                    filteredConfig.providers.ollama.apiUrl = config.providers.ollama.apiUrl;
                }
                if (config.providers?.ollama?.model) {
                    filteredConfig.providers.ollama.model = config.providers.ollama.model;
                }

                // 提取 provider 字段（新配置）
                if (config.provider && ['zhipu', 'iflow', 'ollama'].includes(config.provider)) {
                    filteredConfig.provider = config.provider;
                }

                // 应用主题设置（如果存在）
                if (data.theme) {
                    if (data.theme === 'dark') {
                        document.body.classList.add('dark-theme');
                    } else {
                        document.body.classList.remove('dark-theme');
                    }
                    const button = document.querySelector('.theme-toggle');
                    if (button) {
                        button.textContent = data.theme === 'dark' ? '☀️ 切换主题' : '🌙 切换主题';
                    }
                    saveTheme(data.theme);
                }

                // 保存过滤后的配置
                aiConfig = filteredConfig;
                saveAIConfigToStorage(aiConfig);

                showToast('配置导入成功，请重新选择 AI 提供商', 'success');
                closeAISettingsModal();

                // 刷新页面
                setTimeout(() => {
                    location.reload();
                }, 1500);

            } catch (error) {
                console.error('导入配置失败:', error);
                showToast('配置文件格式错误', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}



// 保存AI配置（从配置界面）
function saveAIConfig() {
    const mode = document.querySelector('input[name="ai-mode"]:checked')?.value || 'manual';
    const provider = document.getElementById('ai-provider').value;
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
    if (provider === 'ollama') {
        const apiUrl = document.getElementById('ai-ollama-api-url').value.trim();
        const model = document.getElementById('ai-ollama-model').value.trim();

        if (!apiUrl || !model) {
            return;
        }

        aiConfig.providers.ollama.apiUrl = apiUrl;
        aiConfig.providers.ollama.model = model;
    } else if (provider === 'zhipu') {
        const apiKey = document.getElementById('ai-zhipu-api-key').value.trim();
        const model = document.getElementById('ai-zhipu-model').value.trim();

        if (!apiKey) {
            return;
        }

        aiConfig.providers.zhipu.apiKey = apiKey;
        aiConfig.providers.zhipu.model = model;
    } else if (provider === 'iflow') {
        const apiKey = document.getElementById('ai-iflow-api-key').value.trim();
        const model = document.getElementById('ai-iflow-model').value.trim();

        if (!apiKey) {
            return;
        }

        aiConfig.providers.iflow.apiKey = apiKey;
        aiConfig.providers.iflow.model = model;
    }

    aiConfig.provider = provider;
    aiConfig.aiCorrectionMode = mode;
    aiConfig.aiPromptTemplateId = templateId;
    aiConfig.aiPromptTemplate = prompt;

    // 保存到 Local Storage
    saveAIConfigToStorage(aiConfig);

    // 立即关闭窗口
    closeAISettingsModal();

    // 立即测试 AI 连接
    showToast('正在测试 AI 连接...', 'info', false);
    
    // 直接调用测试函数，传入 provider
    testAIConnection(provider)
        .then(() => {
            showToast('AI 连接测试成功', 'success');
        })
        .catch((error) => {
            showToast('AI 连接测试失败: ' + error.message, 'error');
        });
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
    document.getElementById('ai-provider').value = aiConfig.provider || 'zhipu';

    // 根据当前提供商填充对应的配置
    handleProviderChange();

    // 加载提示词模板
    loadPromptTemplates().then(() => {
        // 填充下拉选择框
        const select = document.getElementById('ai-prompt-template');
        if (select) {
            select.value = aiConfig.aiPromptTemplateId || 'default';
            handlePromptTemplateChange();
        }
    });

    // 通用配置
    document.getElementById('ai-prompt').value = aiConfig.aiPromptTemplate || '';

    // 显示模态框
    modal.classList.remove('hidden');
}

// 处理提供商切换
function handleProviderChange() {
    const newProvider = document.getElementById('ai-provider').value;

    // 保存当前提供商的配置（从界面输入框读取）
    if (aiConfig.provider && aiConfig.providers[aiConfig.provider]) {
        if (aiConfig.provider === 'zhipu') {
            const apiKey = document.getElementById('ai-zhipu-api-key').value.trim();
            const model = document.getElementById('ai-zhipu-model').value.trim();
            if (apiKey) aiConfig.providers.zhipu.apiKey = apiKey;
            if (model) aiConfig.providers.zhipu.model = model;
        } else if (aiConfig.provider === 'iflow') {
            const apiKey = document.getElementById('ai-iflow-api-key').value.trim();
            const model = document.getElementById('ai-iflow-model').value.trim();
            if (apiKey) aiConfig.providers.iflow.apiKey = apiKey;
            if (model) aiConfig.providers.iflow.model = model;
        } else if (aiConfig.provider === 'ollama') {
            const apiUrl = document.getElementById('ai-ollama-api-url').value.trim();
            const model = document.getElementById('ai-ollama-model').value.trim();
            if (apiUrl) aiConfig.providers.ollama.apiUrl = apiUrl;
            if (model) aiConfig.providers.ollama.model = model;
        }
    }

    // 更新当前提供商
    aiConfig.provider = newProvider;

    // 隐藏所有配置区
    document.getElementById('ai-zhipu-config').classList.add('hidden');
    document.getElementById('ai-iflow-config').classList.add('hidden');
    document.getElementById('ai-ollama-config').classList.add('hidden');

    // 显示对应提供商的配置区
    if (newProvider === 'zhipu') {
        document.getElementById('ai-zhipu-config').classList.remove('hidden');
        document.getElementById('ai-zhipu-api-key').value = aiConfig.providers.zhipu.apiKey || '';
        document.getElementById('ai-zhipu-model').value = aiConfig.providers.zhipu.model || 'glm-4-flash-250414';
    } else if (newProvider === 'iflow') {
        document.getElementById('ai-iflow-config').classList.remove('hidden');
        document.getElementById('ai-iflow-api-key').value = aiConfig.providers.iflow.apiKey || '';
        document.getElementById('ai-iflow-model').value = aiConfig.providers.iflow.model || 'qwen3-max';
    } else if (newProvider === 'ollama') {
        document.getElementById('ai-ollama-config').classList.remove('hidden');
        document.getElementById('ai-ollama-api-url').value = aiConfig.providers.ollama.apiUrl || 'http://localhost:11434/api/generate';
        document.getElementById('ai-ollama-model').value = aiConfig.providers.ollama.model || 'qwen3:0.6b';
    }
}

// 关闭AI设置模态框
function closeAISettingsModal() {
    const modal = document.getElementById('ai-settings-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 清空所有配置
function restoreDefaultConfig() {
    const userInput = prompt('请输入 \'Yes\' 确认恢复默认配置（此操作不可撤销）：');
    
    if (userInput === null) {
        // 用户点击了取消
        showToast('已取消恢复默认配置', 'info');
        return;
    }
    
    if (userInput === 'Yes' || userInput === 'yes') {
        // 清空 Local Storage
        clearAllStorage();
        showToast('已恢复默认配置，正在刷新页面...', 'success');

        // 延迟 1 秒后刷新页面，让用户看到 Toast 提示
        setTimeout(() => {
            location.reload();
        }, 1000);
    } else {
        showToast('输入错误，已取消恢复默认配置', 'warning');
    }
}

// 显示配置更新提示对话框
function showConfigUpdatePrompt(oldConfig) {
    const modal = document.createElement('div');
    modal.className = 'ai-modal';
    modal.id = 'config-update-modal';
    modal.innerHTML = `
        <div class="ai-modal-content">
            <div class="ai-modal-header">
                <h2>配置格式更新</h2>
            </div>
            <div class="ai-modal-body">
                <p>检测到您使用的是旧版本的配置格式。</p>
                <p><strong>⚠️ 请先导出您的配置备份！</strong></p>
                <p>重要信息：API Key 和 Prompt 模板会在导入时保留。</p>
                <p>操作步骤：</p>
                <ol>
                    <li>点击下方"导出配置"按钮</li>
                    <li>确认文件已保存</li>
                    <li>点击"重置配置"清空旧配置</li>
                    <li>点击"导入配置"重新导入</li>
                </ol>
            </div>
            <div class="ai-modal-footer">
                <button onclick="exportOldConfig(${JSON.stringify(oldConfig).replace(/"/g, '&quot;')})">
                    导出配置
                </button>
                <button onclick="resetConfig()">
                    重置配置
                </button>
                <button onclick="dismissConfigUpdatePrompt()">
                    稍后处理
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 导出旧配置
function exportOldConfig(oldConfig) {
    const configJson = JSON.stringify(oldConfig, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'airinputlan-config-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('配置已导出，请保存好此文件', 'success');
}

// 重置配置
function resetConfig() {
    // 清空 Local Storage
    localStorage.removeItem(STORAGE_KEYS.AI_CONFIG);
    showToast('配置已重置，请重新导入', 'success');

    // 关闭提示框
    dismissConfigUpdatePrompt();

    // 刷新页面
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// 关闭配置更新提示对话框
function dismissConfigUpdatePrompt() {
    const modal = document.getElementById('config-update-modal');
    if (modal) {
        modal.remove();
    }
}