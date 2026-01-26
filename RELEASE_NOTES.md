# AirInputLan v1.2.0

## 🎉 新版本发布 / New Release

这是 AirInputLan v1.2.0 版本，添加本地 AI 修正功能。

This is AirInputLan v1.2.0 release, adding local AI correction feature.

## ⚠️ 注意事项 / Important Notes

## MacOS 和 Linux用户请在终端下运行，不要双击运行

## MacOS and Linux Users please run in terminal, DO NOT double-click to run

## ✨ 新功能 / New Features

### v1.2.0 (2026-01-26)

**新增功能 / New Features**:
- ✅ 本地AI修正功能（需要Ollama支持）
  - 右上角添加"🤖 AI修正"按钮，点击打开配置界面
  - 每个历史卡片左侧显示AI修正按钮（启用时显示）
  - 点击按钮即可修正该卡片内容，修正后自动复制到剪贴板
  - 支持配置导出/导入（下载JSON文件）
  - 全内存运行，刷新页面后需要重新导入配置

**注意事项 / Important Notes**:
- ⚠️ 此功能依赖Ollama服务，请确保Ollama已启动并运行在http://localhost:11434
- ⚠️ 配置仅在当前页面有效，刷新网页后配置将丢失，请务必点击"导出配置"保存配置文件

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

---

## 📚 历史版本 / Historical Versions

查看所有历史版本的更新日志，请访问 [CHANGELOG.txt](CHANGELOG.txt)

For the complete changelog of all historical versions, please visit [CHANGELOG.txt](CHANGELOG.txt)
