// 事件总线系统
const EventBus = {
    events: {
        'card:created': [],
        'card:added': [],
        'card:edit:start': [],  // 卡片进入编辑状态
        'card:edit:end': [],    // 卡片退出编辑状态
        'ai:process:start': [],
        'ai:process:completed': [],
        'ai:test:start': [],
        'ai:test:end': [],
        'ai:test:success': [],
        'ai:test:failed': [],
        'ai:config:cancelled': []  // AI配置取消
    },

    // 注册事件监听器
    on(eventName, handler) {
        if (this.events[eventName]) {
            this.events[eventName].push(handler);
        } else {
            console.warn(`未知的事件名称: ${eventName}`);
        }
    },

    // 触发事件
    emit(eventName, ...args) {
        if (this.events[eventName]) {
            this.events[eventName].forEach(handler => {
                try {
                    handler(...args);
                } catch (error) {
                    console.error(`事件处理器执行失败 [${eventName}]:`, error);
                }
            });
        }
    },

    // 移除所有事件监听器（用于测试或重置）
    clear() {
        Object.keys(this.events).forEach(eventName => {
            this.events[eventName] = [];
        });
    }
};