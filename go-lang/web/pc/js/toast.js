// Toast 提示系统
let currentToast = null;
let autoCloseTimer = null;

// 显示 Toast
function showToast(message, type = 'info', autoClose = true) {
    // 如果已有 Toast，先关闭
    if (currentToast) {
        closeToast(currentToast);
    }
    
    // 清除自动关闭定时器
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
    }
    
    // 创建 Toast 元素
    const toast = createToastElement(message, type);
    currentToast = toast;
    
    // 添加到容器
    const container = document.getElementById('toast-container');
    if (container) {
        container.appendChild(toast);
    }
    
    // 自动关闭
    if (autoClose && type !== 'error') {
        autoCloseTimer = setTimeout(() => {
            if (currentToast === toast) {
                closeToast(toast);
                currentToast = null;
            }
        }, 2000);
    }
    
    return toast;
}

// 更新 Toast
function updateToast(message, type) {
    if (!currentToast) {
        return showToast(message, type);
    }
    
    // 清除自动关闭定时器
    if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
    }
    
    // 更新内容
    const messageSpan = currentToast.querySelector('.toast-message');
    if (messageSpan) {
        messageSpan.textContent = message;
    }
    
    // 更新类型
    currentToast.className = `toast ${type}`;
    
    // 更新关闭按钮（仅错误类型显示）
    const closeButton = currentToast.querySelector('.toast-close');
    if (closeButton) {
        closeButton.style.display = type === 'error' ? 'block' : 'none';
    }
    
    // 自动关闭
    if (type !== 'error') {
        autoCloseTimer = setTimeout(() => {
            if (currentToast) {
                closeToast(currentToast);
                currentToast = null;
            }
        }, 2000);
    }
    
    return currentToast;
}

// 关闭 Toast
function closeToast(toast) {
    if (!toast) return;
    
    // 添加淡出动画
    toast.style.animation = 'slideOut 0.3s ease-out';
    
    // 动画结束后移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// 创建 Toast 元素
function createToastElement(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    
    const closeButton = document.createElement('span');
    closeButton.className = 'toast-close';
    closeButton.textContent = '×';
    closeButton.style.display = type === 'error' ? 'block' : 'none';
    closeButton.onclick = () => {
        closeToast(toast);
        if (currentToast === toast) {
            currentToast = null;
        }
    };
    
    toast.appendChild(messageSpan);
    toast.appendChild(closeButton);
    
    return toast;
}

// 导出函数（如果需要模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showToast,
        updateToast,
        closeToast
    };
}