# AirInputLan v1.1.2

## 🎉 新版本发布 / New Release

这是 AirInputLan v1.1.2 版本，修复了多个安全和稳定性问题。

This is AirInputLan v1.1.2 release, fixing multiple security and stability issues.

## ⚠️ 注意事项 / Important Notes

## MacOS 和 Linux用户请在终端下运行，不要双击运行

## MacOS and Linux Users please run in terminal, DO NOT double-click to run

## ✨ 新功能 / New Features

### v1.1.3 (2026-01-25)

**修复问题 / Bug Fixes**:
- 🐛 修复 Linux 上程序退出时浏览器被关闭的问题

### v1.1.2 (2026-01-25)

**修复问题 / Bug Fixes**:
- 🐛 修复卡片开头标点过滤问题
- 🐛 修复 HTTP 服务 Listener 资源泄漏
- 🐛 修复文件锁释放失败问题
- 🐛 修复前端定时器泄漏风险
- 🐛 修复手机端连接检查逻辑，支持同设备刷新重连
- 🐛 修复 PC 端网页 XSS 安全漏洞
- 🐛 修复全局变量 mobileSegmentMode 并发安全问题
- 🐛 修复 SSE 客户端连接管理缺陷

**优化 / Optimizations**:
- ✨ 定义常量替代魔法数字
- ✨ 添加前端全局错误处理
- ✨ 添加前端加载状态显示

### v1.1.1 (2026-01-24)

**用户体验改进 / User Experience Improvements**:
- ✅ **无需互联网连接**：二维码本地生成，不再依赖外部 API
- ✅ **快速退出**：程序退出时间从 1-2 秒优化到约 250ms
- ✅ **中文日志**：所有日志改为中文，更易理解

**修复问题 / Bug Fixes**:
- 🐛 修复允许多个手机端同时连接的问题
- 🐛 修复端口绑定竞态条件
- 🐛 修复前端重连逻辑可能累积定时器的问题
- 🐛 修复 SSE client panic
- 🐛 修复输入长度限制（按字符数计算）
- 🐛 修复 PC 端 XSS 安全漏洞
- 🐛 修复 Windows 单实例锁无效问题

### v1.1 (2026-01-24)

**新增功能 / New Features**:
- ✅ 双模式分段系统（单次输入/连续输入）
- ✅ 手机端主题切换（明亮/暗色）
- ✅ 手机端界面优化（竖向文字、连接状态指示器）

**修复问题 / Bug Fixes**:
- 🐛 修复 PC 端刷新页面后二维码一直显示的问题
- 🐛 修复模式切换时双重分段的问题
- 🐛 修复手机重连后模式不一致的问题
- 🐛 优化按钮状态更新时机（等待服务端确认）

---

## 📚 历史版本 / Historical Versions

查看所有历史版本的更新日志，请访问 [CHANGELOG.txt](CHANGELOG.txt)

For the complete changelog of all historical versions, please visit [CHANGELOG.txt](CHANGELOG.txt)
