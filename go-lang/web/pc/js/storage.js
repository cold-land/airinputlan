// Local Storage 管理系统

// Local Storage 键名
const STORAGE_KEYS = {
    AI_CONFIG: 'airinputlan_ai_config',
    THEME: 'airinputlan_theme',
    CUSTOM_TEMPLATES: 'airinputlan_custom_templates'
};

// 检测 Local Storage 是否可用
function isLocalStorageAvailable() {
    try {
        const testKey = '__test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

// 保存到 Local Storage
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('保存到 Local Storage 失败:', e);
        return false;
    }
}

// 从 Local Storage 加载
function loadFromStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        if (value === null) {
            return defaultValue;
        }
        return JSON.parse(value);
    } catch (e) {
        console.error('从 Local Storage 加载失败:', e);
        return defaultValue;
    }
}

// 保存 AI 配置
function saveAIConfigToStorage(config) {
    if (!isLocalStorageAvailable()) {
        console.warn('Local Storage 不可用，无法保存 AI 配置');
        return false;
    }

    const success = saveToStorage(STORAGE_KEYS.AI_CONFIG, config);
    if (success) {
        console.log('AI 配置已保存到 Local Storage');
    }
    return success;
}

// 加载 AI 配置
function loadAIConfigFromStorage() {
    if (!isLocalStorageAvailable()) {
        console.warn('Local Storage 不可用，无法加载 AI 配置');
        return null;
    }

    const config = loadFromStorage(STORAGE_KEYS.AI_CONFIG, null);
    if (config) {
        console.log('AI 配置已从 Local Storage 加载');
    }
    return config;
}

// 保存主题
function saveTheme(theme) {
    if (!isLocalStorageAvailable()) {
        console.warn('Local Storage 不可用，无法保存主题');
        return false;
    }
    
    const success = saveToStorage(STORAGE_KEYS.THEME, theme);
    if (success) {
        console.log('主题已保存到 Local Storage');
    }
    return success;
}

// 加载主题
function loadTheme() {
    if (!isLocalStorageAvailable()) {
        console.warn('Local Storage 不可用，无法加载主题');
        return null;
    }
    
    const theme = loadFromStorage(STORAGE_KEYS.THEME, null);
    if (theme) {
        console.log('主题已从 Local Storage 加载');
    }
    return theme;
}

// 清除所有配置
function clearAllStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.AI_CONFIG);
        localStorage.removeItem(STORAGE_KEYS.THEME);
        localStorage.removeItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
        console.log('所有配置已清除');
        return true;
    } catch (e) {
        console.error('清除配置失败:', e);
        return false;
    }
}

// 保存自定义模板
function saveCustomTemplate(template) {
    if (!isLocalStorageAvailable()) {
        console.warn('Local Storage 不可用，无法保存自定义模板');
        return false;
    }

    const customTemplates = loadCustomTemplates();
    const index = customTemplates.findIndex(t => t.id === template.id);
    
    if (index !== -1) {
        customTemplates[index] = template;
    } else {
        customTemplates.push(template);
    }

    const success = saveToStorage(STORAGE_KEYS.CUSTOM_TEMPLATES, customTemplates);
    if (success) {
        console.log('自定义模板已保存:', template.name);
    }
    return success;
}

// 加载所有自定义模板
function loadCustomTemplates() {
    if (!isLocalStorageAvailable()) {
        console.warn('Local Storage 不可用，无法加载自定义模板');
        return [];
    }

    const templates = loadFromStorage(STORAGE_KEYS.CUSTOM_TEMPLATES, []);
    return templates;
}

// 删除自定义模板
function deleteCustomTemplate(templateId) {
    if (!isLocalStorageAvailable()) {
        console.warn('Local Storage 不可用，无法删除自定义模板');
        return false;
    }

    const customTemplates = loadCustomTemplates();
    const index = customTemplates.findIndex(t => t.id === templateId);
    
    if (index === -1) {
        console.warn('未找到模板:', templateId);
        return false;
    }

    customTemplates.splice(index, 1);
    const success = saveToStorage(STORAGE_KEYS.CUSTOM_TEMPLATES, customTemplates);
    if (success) {
        console.log('自定义模板已删除:', templateId);
    }
    return success;
}

// 清除所有自定义模板
function clearAllCustomTemplates() {
    if (!isLocalStorageAvailable()) {
        console.warn('Local Storage 不可用，无法清除自定义模板');
        return false;
    }

    const success = saveToStorage(STORAGE_KEYS.CUSTOM_TEMPLATES, []);
    if (success) {
        console.log('所有自定义模板已清除');
    }
    return success;
}

// 导出函数（如果需要模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isLocalStorageAvailable,
        saveToStorage,
        loadFromStorage,
        saveAIConfigToStorage,
        loadAIConfigFromStorage,
        saveTheme,
        loadTheme,
        clearAllStorage,
        saveCustomTemplate,
        loadCustomTemplates,
        deleteCustomTemplate,
        clearAllCustomTemplates
    };
}