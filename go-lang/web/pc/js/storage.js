// Local Storage 管理系统

// Local Storage 键名
const STORAGE_KEYS = {
    AI_CONFIG: 'airinputlan_ai_config',
    THEME: 'airinputlan_theme'
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
        console.log('所有配置已清除');
        return true;
    } catch (e) {
        console.error('清除配置失败:', e);
        return false;
    }
}

// 导出函数（如果需要模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isLocalStorageAvailable,
        saveToStorage,
        loadFromStorage,
        saveAIConfig,
        loadAIConfig,
        saveTheme,
        loadTheme,
        clearAllStorage
    };
}