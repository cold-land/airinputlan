// 页面加载完成后启动应用
window.addEventListener('DOMContentLoaded', () => {
    init();

    // 添加提示词模板选择框的事件监听器
    const promptTemplateSelect = document.getElementById('ai-prompt-template');
    if (promptTemplateSelect) {
        promptTemplateSelect.addEventListener('change', handlePromptTemplateChange);
    }
});