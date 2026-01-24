# AirInputLan v1.1

## 🎉 新版本发布 / New Release

这是 AirInputLan v1.1 版本，新增了双模式分段系统和手机端主题切换功能。

This is AirInputLan v1.1 release, adding dual-mode segmentation system and mobile theme switching features.

## ⚠️ 注意事项 / Important Notes

**macOS 和 Linux 用户请注意**：
- 本程序需要在**终端**中运行，不能双击直接运行
- 如果双击运行，程序会在后台运行，不会显示任何窗口
- 请使用以下命令运行：
  ```bash
  chmod +x AirInputLan-*
  ./AirInputLan-x86_64-linux  # Linux
  ./AirInputLan-x86_64-macos   # macOS Intel
  ./AirInputLan-arm64-macos    # macOS Apple Silicon
  ```
- Windows 用户可以双击 `AirInputLan-x86_64-win.exe` 直接运行

**其他注意事项**：
- Windows：首次运行会弹出防火墙提示，点击"允许"
- 手机和电脑必须在同一个局域网内
- **二维码生成依赖网络**：如果电脑没有公网连接，可以手动在手机浏览器输入 IP 地址和端口
- macOS 版本未使用 UPX 压缩，避免被 Gatekeeper 杀掉

**macOS and Linux Users Please Note**:
- This program must be run in **terminal**, cannot be run by double-click
- If run by double-click, program will run in background without any window
- Please use the following command to run:
  ```bash
  chmod +x AirInputLan-*
  ./AirInputLan-x86_64-linux  # Linux
  ./AirInputLan-x86_64-macos   # macOS Intel
  ./AirInputLan-arm64-macos    # macOS Apple Silicon
  ```
- Windows users can double-click `AirInputLan-x86_64-win.exe` to run directly

**Other Important Notes**:
- Windows: Firewall prompt will appear on first run, click "Allow"
- Mobile and PC must be in the same LAN
- **QR code generation depends on network**: If PC has no external network connection, you can manually enter IP address and port in mobile browser
- macOS versions are not compressed with UPX to avoid being killed by Gatekeeper

## ✨ 新功能 / New Features

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

### v1.0.34 (2026-01-23)

**新增功能 / New Features**:
- ✅ 主题切换功能（明亮/暗色）
- ✅ 重复字高亮功能
- ✅ 增强内容过滤（过滤单独标点符号和空格）

**修复问题 / Bug Fixes**:
- 🐛 修复 UTF-8 字符计数问题
- 🐛 修复 PC 端刷新页面后二维码一直显示的问题

### v1.0.33

- 首次公开版本
- Initial public release
- 基础功能完整
- Basic features complete

---

## 📚 历史版本 / Historical Versions

查看所有历史版本的更新日志，请访问 [CHANGELOG.txt](CHANGELOG.txt)

For the complete changelog of all historical versions, please visit [CHANGELOG.txt](CHANGELOG.txt)