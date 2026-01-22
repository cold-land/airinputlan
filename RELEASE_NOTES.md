# AirInputLan v1.0.33

## 🎉 首次发布 / First Release

这是 AirInputLan 的第一个公开版本。

This is the first public release of AirInputLan.

## ⚠️ 注意事项 / Important Notes

**macOS 和 Linux 用户请注意**：
- 本程序需要在**终端**中运行，不能双击直接运行
- 如果双击运行，程序会在后台运行，不会显示任何窗口
- 请使用以下命令运行：
  ```bash
  chmod +x AirInputLan
  ./AirInputLan
  ```
- Windows 用户可以双击 `AirInputLan.exe` 直接运行

**其他注意事项**：
- Windows：首次运行会弹出防火墙提示，点击"允许"
- 手机和电脑必须在同一个局域网内
- **二维码生成依赖网络**：如果电脑没有公网连接，可以手动在手机浏览器输入 IP 地址和端口

**macOS and Linux Users Please Note**:
- This program must be run in **terminal**, cannot be run by double-click
- If run by double-click, program will run in background without any window
- Please use the following command to run:
  ```bash
  chmod +x AirInputLan
  ./AirInputLan
  ```
- Windows users can double-click `AirInputLan.exe` to run directly

**Other Important Notes**:
- Windows: Firewall prompt will appear on first run, click "Allow"
- Mobile and PC must be in the same LAN
- **QR code generation depends on network**: If PC has no external network connection, you can manually enter IP address and port in mobile browser

## ✨ 新功能 / New Features

- 手机输入，电脑实时同步
- 跨平台支持（Windows/macOS/Linux）
- 零依赖运行，单文件可执行程序
- 全内存运行，无本地数据残留
- 自动分段，2秒无输入自动生成历史卡片
- 多网卡支持，优先选择以太网
- Web 界面，简洁易用
- 双语文档（中文和英文）

- Mobile input, PC real-time sync
- Cross-platform support (Windows/macOS/Linux)
- Zero dependency, single executable file
- In-memory only, no local data residue
- Auto-segment, generate history card after 2 seconds of no input
- Multi-NIC support, prioritize Ethernet
- Web interface, simple and easy to use
- Bilingual documentation (Chinese and English)

## 🐛 已知问题 / Known Issues

- 允许多设备连接（设计应该只支持单设备）
- 程序崩溃后锁文件可能未清理

- Allows multiple devices to connect (design should support single device only)
- Lock file may not be cleaned after program crash