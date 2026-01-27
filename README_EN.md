# AirInputLan - Mobile Input, PC Real-time Sync

[中文文档](README.md)

PC voice input lags behind mobile. AirInputLan syncs mobile input to PC in real-time via LAN, suitable for mixed Chinese/English input, AI conversations, meeting records, etc.

## ✨ Features

- ✅ **Cross-platform Support** - Windows/macOS/Linux full platform support
- ✅ **Smart Network Card Recognition** - Auto-detect Ethernet, USB shared, WiFi, virtual network cards, sorted by priority
- ✅ **Real-time Text Sync** - Low-latency sync via SSE
- ✅ **AI Correction Feature** - Supports manual and automatic AI correction modes
  - **Manual Correction**: Click AI button on left side of card to correct
  - **Automatic Correction**: Automatically trigger AI correction when new card is generated
- ✅ **AI Provider Support**
  - **Local AI**: Requires Ollama support
  - **Online AI**: Supports Zhipu AI and Alibaba iFlow
- ✅ **Dual-mode Segmentation** - Supports single input mode and continuous input mode
- ✅ **Theme Toggle** - Supports light and dark themes
- ✅ **Easy Operations** - Click to copy, double-click to edit

## 🚀 Usage

### Download and Run

Download the executable for your platform from [Releases](../../releases):

#### ⚠️ Important Note: macOS and Linux Users

**macOS and Linux users must run the program in terminal (command line), do not double-click the file!**

#### Startup Method

- **Windows**: Double-click `AirInputLan.exe`
- **macOS**: Open terminal, navigate to file directory, run `./AirInputLan[-x86_64|-arm64]`
- **Linux**: Open terminal, navigate to file directory, run `./AirInputLan[-x86_64|-arm64]`

The program will automatically open a browser to display the PC interface.

### Basic Workflow

1. **Select Network Card** (if multiple) - Prefer "Ethernet" or "USB Shared"
2. **Open Mobile Interface** - Scan QR code or enter displayed address in mobile browser
3. **Start Input** - Type text on mobile, real-time sync to PC
4. **Use Cards** - Click to copy, double-click to edit

## ❓ FAQ

### Mobile cannot access PC?

**Solutions:**
1. Check firewall settings, allow port 5000
2. Confirm mobile and PC on same LAN

#### Windows Firewall
When running program for the first time, Windows will show firewall prompt, click "Allow".

#### Linux Firewall (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

#### Linux Firewall (ufw)
```bash
sudo ufw allow 5000/tcp
```

#### macOS Firewall
Open "System Preferences" → "Security & Privacy" → "Firewall", add `AirInputLan` and allow incoming connections.

## 📦 Version History

### v1.2.5 (Current Version)

**New Features:**
- ✅ Online AI correction feature (supports Zhipu AI and Alibaba iFlow)
- ✅ Automatic AI correction feature (manual/auto modes)
- ✅ Configuration persistence (auto-save, auto-restore after refresh)
- ✅ Prompt template presets feature
- ✅ Standalone template editor tool
- ✅ Restore default configuration feature
- ✅ Toast notification system
- ✅ Support multiple PCs viewing simultaneously

## 📄 License

MIT License

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

## 📧 Contact

For questions or suggestions, please submit an Issue.