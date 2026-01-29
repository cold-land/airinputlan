# AirInputLan v1.2.7

## 🎉 新版本发布 / New Release

这是 AirInputLan v1.2.7 版本，整合了 v1.2.6 和 v1.2.7 的所有功能更新。

This is AirInputLan v1.2.7 release, integrating all feature updates from v1.2.6 to v1.2.7.

## ✨ 新功能 / New Features

### 事件驱动架构 / Event-Driven Architecture
- ✅ 新增 EventBus 系统
  - 实现模块间解耦，提升代码可维护性
  - 通过事件总线管理卡片添加、AI 修正、测试等事件

- ✅ Event-driven Architecture
  - Implement module decoupling for better code maintainability
  - Manage card addition, AI correction, testing events via event bus

### 空提示词模式 Markdown 渲染 / Markdown Rendering in Empty Prompt Mode
- ✅ 空提示词模式支持 Markdown 渲染
  - 可直接与 AI 对话，支持 Markdown 格式显示
  - 支持标题、列表、代码块、粗体、斜体等 Markdown 语法
  - 自动适配亮色和暗色主题

- ✅ Empty prompt template supports Markdown rendering
  - Direct AI conversation with Markdown format display
  - Support Markdown syntax: headings, lists, code blocks, bold, italic
  - Auto-adapt to light and dark themes

## 🚀 用户体验改进 / User Experience Improvements

### PC 端自动退出 / Auto-Exit on PC Disconnect
- ✅ PC 端断开 10 秒后程序自动退出
  - 防止实例锁导致程序在后台运行
  - 提升用户体验，避免资源浪费

- ✅ Program auto-exits 10 seconds after PC disconnects
  - Prevent program from running in background due to instance lock
  - Improve user experience and avoid resource waste

## 🔧 代码优化 / Code Optimization

### API 并发控制 / API Concurrency Control
- ✅ 防止 API 并发机制
  - 确保同一时间只有一个 AI 请求在执行
  - 避免多个请求同时发送导致的混乱

- ✅ Prevent API concurrency
  - Ensure only one AI request executes at a time
  - Avoid confusion caused by multiple simultaneous requests

## 🐛 Bug 修复 / Bug Fixes

### Ollama API 预热 / Ollama API Warmup
- ✅ 修复 Ollama API 预热失败问题
  - 优化预热逻辑，确保首次使用时 API 可用

- ✅ Fixed Ollama API warmup failure
  - Optimize warmup logic to ensure API availability on first use

### 编辑模式 / Edit Mode
- ✅ 修复编辑模式下点击历史卡片重复复制问题
  - 优化卡片点击事件处理逻辑

- ✅ Fixed duplicate copy issue when clicking history cards in edit mode
  - Optimize card click event handling logic

## 📚 历史版本 / Historical Versions

查看所有历史版本的更新日志，请访问 [CHANGELOG.txt](CHANGELOG.txt)

For the complete changelog of all historical versions, please visit [CHANGELOG.txt](CHANGELOG.txt)

---

**发布日期 / Release Date**: 2026-01-28
**许可证 / License**: MIT License