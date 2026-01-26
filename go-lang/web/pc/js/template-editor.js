// 提示词模板编辑器
let templates = [];
let currentTemplateId = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    showImportState();
});

// 显示导入状态
function showImportState() {
    const listContainer = document.getElementById('template-list');
    const editorContent = document.getElementById('editor-content');
    
    listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">请先导入 JSON 文件</div>';
    
    editorContent.innerHTML = `
        <div class="empty-state">
            <h3>欢迎使用提示词模板编辑器</h3>
            <p>请点击左侧的"导入"按钮，选择要编辑的 prompt-templates.json 文件</p>
            <p style="margin-top: 10px; font-size: 12px; color: #999;">提示：这是一个离线工具，双击 HTML 文件即可使用</p>
        </div>
    `;
}

// 渲染模板列表
function renderTemplateList() {
    const listContainer = document.getElementById('template-list');
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    
    // 过滤模板
    const filteredTemplates = templates.filter(template => 
        template.name.toLowerCase().includes(searchInput) ||
        template.id.toLowerCase().includes(searchInput)
    );
    
    if (filteredTemplates.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">没有找到匹配的模板</div>';
        return;
    }
    
    listContainer.innerHTML = filteredTemplates.map(template => `
        <div class="template-item ${currentTemplateId === template.id ? 'active' : ''}" 
             onclick="selectTemplate('${template.id}')">
            <div class="template-id">ID: ${template.id}</div>
            <div class="template-name">${escapeHtml(template.name)}</div>
            <div class="template-actions">
                <button onclick="event.stopPropagation(); editTemplate('${template.id}')">✏️ 编辑</button>
                <button onclick="event.stopPropagation(); copyTemplate('${template.id}')">📋 复制</button>
                <button onclick="event.stopPropagation(); deleteTemplate('${template.id}')" style="color: #dc3545;">🗑️ 删除</button>
            </div>
        </div>
    `).join('');
}

// 选择模板
function selectTemplate(id) {
    currentTemplateId = id;
    renderTemplateList();
    showEditor(id);
}

// 显示编辑器
function showEditor(id) {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    
    const editorContent = document.getElementById('editor-content');
    editorContent.innerHTML = `
        <div class="editor-form">
            <div class="form-group">
                <label for="template-id">模板 ID（只读）</label>
                <input type="text" id="template-id" value="${escapeHtml(template.id)}" readonly>
            </div>
            <div class="form-group">
                <label for="template-name">模板名称</label>
                <input type="text" id="template-name" value="${escapeHtml(template.name)}" 
                       oninput="updateCharCount()">
            </div>
            <div class="form-group">
                <label for="template-prompt">提示词内容</label>
                <textarea id="template-prompt" 
                          oninput="updateCharCount()">${escapeHtml(template.prompt)}</textarea>
                <div class="char-count" id="char-count">字符数: ${template.prompt.length}</div>
            </div>
            <div class="form-actions">
                <button class="btn-secondary" onclick="cancelEdit()">取消</button>
                <button class="btn-danger" onclick="deleteCurrentTemplate()">删除</button>
                <button class="btn-primary" onclick="saveTemplate('${template.id}')">保存</button>
            </div>
        </div>
    `;
}

// 添加新模板
function addTemplate() {
    const newId = 'template_' + Date.now();
    const newTemplate = {
        id: newId,
        name: '新模板',
        prompt: ''
    };
    
    templates.push(newTemplate);
    currentTemplateId = newId;
    renderTemplateList();
    showEditor(newId);
}

// 编辑模板
function editTemplate(id) {
    selectTemplate(id);
}

// 复制模板
function copyTemplate(id) {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    
    const newId = 'template_' + Date.now();
    const newTemplate = {
        id: newId,
        name: template.name + ' (副本)',
        prompt: template.prompt
    };
    
    templates.push(newTemplate);
    currentTemplateId = newId;
    renderTemplateList();
    showEditor(newId);
}

// 删除模板
function deleteTemplate(id) {
    templates = templates.filter(t => t.id !== id);
    if (currentTemplateId === id) {
        currentTemplateId = null;
        showEmptyState();
    }
    renderTemplateList();
}

// 删除当前模板
function deleteCurrentTemplate() {
    if (!currentTemplateId) return;
    deleteTemplate(currentTemplateId);
}

// 保存模板
function saveTemplate(id) {
    const name = document.getElementById('template-name').value.trim();
    const prompt = document.getElementById('template-prompt').value.trim();
    
    if (!name) {
        console.log('请输入模板名称');
        return;
    }
    
    if (!prompt) {
        console.log('请输入提示词内容');
        return;
    }
    
    const template = templates.find(t => t.id === id);
    if (template) {
        template.name = name;
        template.prompt = prompt;
        renderTemplateList();
        console.log('保存成功');
    }
}

// 取消编辑
function cancelEdit() {
    if (currentTemplateId) {
        showEditor(currentTemplateId);
    } else {
        showEmptyState();
    }
}

// 显示空状态
function showEmptyState() {
    const editorContent = document.getElementById('editor-content');
    editorContent.innerHTML = `
        <div class="empty-state">
            <h3>请选择一个模板进行编辑</h3>
            <p>或者点击"新建"按钮创建新模板</p>
        </div>
    `;
}

// 更新字数统计
function updateCharCount() {
    const prompt = document.getElementById('template-prompt');
    const charCount = document.getElementById('char-count');
    if (prompt && charCount) {
        charCount.textContent = `字符数: ${prompt.value.length}`;
    }
}

// 过滤模板
function filterTemplates() {
    renderTemplateList();
}

// 导入模板
function importTemplates() {
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
                if (data.templates && Array.isArray(data.templates)) {
                    templates = data.templates;
                    currentTemplateId = null;
                    renderTemplateList();
                    showEmptyState();
                    console.log('导入成功');
                } else {
                    console.error('文件格式错误：缺少 templates 数组');
                }
            } catch (error) {
                console.error('文件解析失败：', error.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 导出模板
function exportTemplates() {
    const data = {
        templates: templates
    };
    
    const json = JSON.stringify(data, null, 4);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt-templates.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}