// AI配置（全内存运行）
const DEFAULT_AI_CONFIG = {
    aiCorrectionMode: 'manual', // 'manual' 或 'auto'
    aiProvider: 'online',       // 'local' 或 'online'（默认在线）

    // 本地 AI 配置（Ollama）
    localApiUrl: 'http://localhost:11434/api/generate',
    localModel: 'qwen3:0.6b',

    // 在线 AI 配置（按提供商分别存储）
    onlineProvider: 'zhipu',    // 在线提供商：'zhipu' / 'iflow' 等
    onlineApiKeys: {
        zhipu: '',
        iflow: ''
    },
    onlineModels: {
        zhipu: 'glm-4-flash-250414',
        iflow: 'qwen3-max'
    },

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
        // 使用深度合并策略，确保嵌套对象正确合并
        aiConfig = {
            ...DEFAULT_AI_CONFIG,
            ...savedConfig,
            // 深度合并 onlineApiKeys
            onlineApiKeys: {
                ...DEFAULT_AI_CONFIG.onlineApiKeys,
                ...(savedConfig.onlineApiKeys || {})
            },
            // 深度合并 onlineModels
            onlineModels: {
                ...DEFAULT_AI_CONFIG.onlineModels,
                ...(savedConfig.onlineModels || {})
            }
        };
        console.log('AI 配置已从 Local Storage 加载');
        console.log('加载的配置:', aiConfig);
    }
}

// 后台预热在线 AI
async function warmupOnlineAI() {
    if (aiConfig.aiProvider === 'online' && aiConfig.onlineApiKeys && aiConfig.onlineApiKeys[aiConfig.onlineProvider]) {
        try {
            await testOnlineAIConfig(aiConfig.onlineApiKeys[aiConfig.onlineProvider], aiConfig.onlineModels[aiConfig.onlineProvider], aiConfig.onlineProvider);
            console.log('在线 AI 预热成功');
        } catch (e) {
            console.log('在线 AI 预热失败:', e);
        }
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

                // 检查是否包含 aiConfig
                if (!data.aiConfig) {
                    showToast('配置文件格式错误：缺少 aiConfig', 'error');
                    return;
                }

                const config = data.aiConfig;

                // 应用配置（使用当前配置作为基础，导入的配置覆盖对应字段）
                // 对于嵌套对象（onlineApiKeys, onlineModels），使用合并策略
                aiConfig = {
                    ...aiConfig,
                    ...config,
                    // 深度合并 onlineApiKeys
                    onlineApiKeys: {
                        ...(aiConfig.onlineApiKeys || {}),
                        ...(config.onlineApiKeys || {})
                    },
                    // 深度合并 onlineModels
                    onlineModels: {
                        ...(aiConfig.onlineModels || {}),
                        ...(config.onlineModels || {})
                    }
                };

                // 应用主题设置
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
                }

                // 保存到 Local Storage
                saveAIConfigToStorage(aiConfig);
                if (data.theme) {
                    saveTheme(data.theme);
                }

                showToast('配置已导入', 'success');

            } catch (error) {
                console.error('配置导入失败:', error);
                showToast('配置文件解析失败', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 测试在线 AI 配置
async function testOnlineAIConfig(apiKey, model, onlineProvider = 'zhipu') {
    // 根据 provider 选择 API 地址和请求体
    let apiUrl = '';
    let requestBody = {
        model: model,
        messages: [
            {
                role: "user",
                content: "测试"
            }
        ],
        max_tokens: 10,
        temperature: 0.0,
        stream: true
    };

    switch (onlineProvider) {
        case 'iflow':
            apiUrl = 'https://apis.iflow.cn/v1/chat/completions';
            // 阿里心流不需要 thinking 参数
            break;
        case 'zhipu':
        default:
            apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
            // 清华智谱需要 thinking 参数
            requestBody.thinking = {
                type: "disabled"
            };
            break;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
        console.log('测试 AI 配置:', {
            provider: onlineProvider,
            apiUrl: apiUrl,
            model: model,
            apiKey: apiKey.substring(0, 10) + '...'
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('AI 响应状态:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI 响应错误:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(`HTTP ${response.status}: ${errorData.error?.message || errorData.message || response.statusText}`);
            } catch (e) {
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText.substring(0, 200)}`);
            }
        }

        // 读取流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let hasValidData = false;
        let contentFound = false;

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    // 流结束
                    if (!contentFound) {
                        console.error('AI 返回空结果 - 流结束但未找到有效内容');
                        throw new Error('AI返回空结果，请检查服务是否正常运行');
                    }
                    console.log('AI 测试完成，找到有效内容');
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                console.log('AI 响应数据块:', chunk);

                // 检查是否包含有效的 SSE 数据
                if (chunk.includes('data:')) {
                    // 解析所有数据块
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const data = line.slice(5).trim();
                            if (data === '[DONE]') {
                                console.log('收到 [DONE] 信号');
                                continue;
                            }
                            if (!data) {
                                continue;
                            }
                            try {
                                const json = JSON.parse(data);
                                console.log('解析 JSON:', json);
                                if (json.choices && json.choices.length > 0) {
                                    const delta = json.choices[0].delta;
                                    console.log('Delta 内容:', delta);
                                    // 检查是否有实际内容（content 或 reasoning_content）
                                    if (delta && (delta.content || delta.reasoning_content)) {
                                        contentFound = true;
                                        hasValidData = true;
                                        console.log('AI 响应成功，找到有效内容:', delta.content || delta.reasoning_content);
                                    } else if (delta && delta.role) {
                                        // 只有 role，没有 content，继续等待
                                        console.log('收到 role 信息，继续等待 content:', delta.role);
                                        hasValidData = true;
                                    }
                                }
                            } catch (e) {
                                console.error('解析 JSON 失败:', e, '数据:', data);
                            }
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        if (!contentFound) {
            console.error('AI 返回无效数据 - 未找到任何内容');
            throw new Error('AI返回无效数据，请检查服务是否正常运行');
        }

        return true;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('连接超时，请检查网络连接');
        }
        console.error('测试 AI 配置失败:', error);
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
            onlineApiKeys: aiConfig.onlineApiKeys,
            onlineModels: aiConfig.onlineModels,
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

        // 确保 onlineApiKeys 和 onlineModels 对象存在
        if (!aiConfig.onlineApiKeys) {
            aiConfig.onlineApiKeys = {};
        }
        if (!aiConfig.onlineModels) {
            aiConfig.onlineModels = {};
        }

        // 保存到对应的提供商字段
        aiConfig.onlineApiKeys[onlineProvider] = onlineApiKey;
        aiConfig.onlineModels[onlineProvider] = onlineModel;
        aiConfig.onlineProvider = onlineProvider;

        aiConfig = {
            aiCorrectionMode: mode,
            aiProvider: 'online',
            localApiUrl: aiConfig.localApiUrl,
            localModel: aiConfig.localModel,
            onlineProvider: onlineProvider,
            onlineApiKeys: aiConfig.onlineApiKeys,
            onlineModels: aiConfig.onlineModels,
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
        testOnlineAIConfig(onlineApiKey, onlineModel, onlineProvider).then(() => {
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
    document.getElementById('ai-online-provider').value = aiConfig.onlineProvider || 'zhipu';

    // 根据当前提供商加载对应的 API Key 和模型名称
    const currentProvider = aiConfig.onlineProvider || 'zhipu';

    // 根据提供商更新模型下拉框选项
    const modelSelect = document.getElementById('ai-online-model-select');
    modelSelect.innerHTML = '<option value="">选择模型...</option>';

    if (currentProvider === 'iflow') {
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

    if (aiConfig.onlineApiKeys && aiConfig.onlineApiKeys[currentProvider]) {
        document.getElementById('ai-online-api-key').value = aiConfig.onlineApiKeys[currentProvider];
    } else {
        document.getElementById('ai-online-api-key').value = '';
    }

    if (aiConfig.onlineModels && aiConfig.onlineModels[currentProvider]) {
        document.getElementById('ai-online-model').value = aiConfig.onlineModels[currentProvider];
        document.getElementById('ai-online-model-select').value = aiConfig.onlineModels[currentProvider];
    } else {
        // 根据提供商设置默认模型
        if (currentProvider === 'iflow') {
            document.getElementById('ai-online-model').value = 'qwen3-max';
            document.getElementById('ai-online-model-select').value = 'qwen3-max';
        } else {
            document.getElementById('ai-online-model').value = 'glm-4-flash-250414';
            document.getElementById('ai-online-model-select').value = 'glm-4-flash-250414';
        }
    }

    // 模型选择框事件监听
    const modelInput = document.getElementById('ai-online-model');
    if (modelSelect && modelInput) {
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

    // 添加点击遮罩层关闭事件
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeAISettingsModal();
        }
    };
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