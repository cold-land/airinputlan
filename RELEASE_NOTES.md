# AirInputLan v1.0.34

## 🎉 新版本发布 / New Release

这是 AirInputLan v1.0.34 版本，新增了主题切换和重复字高亮功能。

This is AirInputLan v1.0.34 release, adding theme switching and duplicate character highlighting features.

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

### 主题切换 / Theme Switching

- 新增明亮和暗色两种主题
- 右上角按钮切换主题
- 所有组件完美适配两种主题

- Added light and dark themes
- Switch theme via button in top-right corner
- All components perfectly adapted to both themes

### 重复字高亮 / Duplicate Character Highlighting

- 自动检测历史卡片中的重复字符
- 支持单字重复（如"好好"、"天天"）
- 支持双字重复（如"非常非常"、"了。了。"）
- 背景色高亮，明亮主题黄色，暗色主题橙色
- 编辑卡片时实时更新高亮

- Automatically detect duplicate characters in history cards
- Support single character duplication (e.g., "好好", "天天")
- Support double character duplication (e.g., "非常非常", "了。了。")
- Background color highlighting: yellow for light theme, orange for dark theme
- Real-time update highlighting when editing cards

### 内容过滤增强 / Enhanced Content Filtering

- 过滤单独的标点符号和空格（中文和英文）

- Filter standalone punctuation marks and spaces (Chinese and English)

## 🐛 已修复问题 / Bug Fixes

- 修复 UTF-8 字符计数问题，正确处理中文标点符号
- 修复 PC 端刷新页面后二维码一直显示的问题

- Fixed UTF-8 character counting issue, correctly handling Chinese punctuation
- Fixed issue where QR code remains visible after PC page refresh

## 📝 完整更新日志 / Full Changelog

### v1.0.34 (2026-01-23)
- 新增主题切换功能（明亮/暗色）
- 新增重复字高亮功能
- 增强内容过滤（过滤单独标点符号和空格）
- 修复 UTF-8 字符计数问题

### v1.0.33
- 首次公开版本