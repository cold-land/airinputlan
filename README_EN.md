# AirInputLan - Mobile Input, PC Real-time Sync

[中文文档](README.md)

PC voice input lags behind mobile. AirInputLan syncs mobile input to PC in real-time via LAN, suitable for mixed Chinese/English input, AI conversations, meeting records, etc.

## Project Information

This project provides implementations in two languages:

- **go-lang/** - Go version (main version, fully featured, recommended)
- **nim-lang/** - Nim version (author's personal learning project for learning Nim and comparing development experience)

> **Recommend using the go-lang version**, which is fully featured and thoroughly tested.
## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [FAQ](#faq)
- [Important Notes](#important-notes)
- [Known Issues](#known-issues)
- [Network Configuration](#network-configuration)
- [Troubleshooting](#troubleshooting)
- [Build Instructions](#build-instructions)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Version History](#version-history)

## ✨ Features

- ✅ **Cross-platform Support** - Windows/macOS/Linux
- ✅ **Smart Network Card Recognition** - Auto-detect USB shared, local, and virtual network cards
- ✅ **Priority Sorting** - Ethernet > USB Shared > WiFi > Virtual
- ✅ **Real-time Text Sync** - Low-latency sync via SSE
- ✅ **Auto-segment Management** - Auto-generate cards after 2 seconds of no input
- ✅ **Easy Operations** - Click to copy, double-click to edit
- ✅ **Zero Dependencies** - Single executable file, run with double-click
- ✅ **In-memory Only** - Auto-clear data on exit, no local residue, protects user privacy
- ✅ **Single Instance Protection** - Prevent multiple instances, auto-cleanup stale locks
- ✅ **Auto Port Adaptation** - Try available ports starting from 5000

## 🚀 Quick Start

### Download Pre-built Version

Download the executable for your platform from [Releases](../../releases):

| Platform | Filename | Size |
|----------|----------|------|
| Windows | `AirInputLan.exe` | ~1.9M |
| macOS | `AirInputLan` | ~1.9M |
| Linux | `AirInputLan` | ~1.9M |

After download, simply run:
- **Windows**: Double-click `AirInputLan.exe`
- **macOS**: Run `./AirInputLan`
- **Linux**: Run `./AirInputLan`

The program will automatically open a browser to display the PC interface.

## 📖 Usage

### Basic Workflow

1. **Start Program**
   - Windows: Double-click `AirInputLan.exe`
   - macOS/Linux: Run `./AirInputLan`
   - Program will automatically open browser to display PC interface

2. **Select Network Card (if multiple detected)**
   - If multiple network cards are detected, select one in PC interface
   - Prefer "Ethernet" type network cards
   - If USB shared network is available, select USB network card

3. **Open Mobile Input Interface**
   - Method 1: Scan QR code displayed on PC with mobile browser
   - Method 2: Enter displayed IP address and port in mobile browser (e.g., `http://192.168.1.10:5000`)

4. **Start Input**
   - Type text on mobile
   - Content syncs to PC bottom in real-time
   - Auto-generate history cards after 2 seconds of no input

5. **Use Cards**
   - Click card: Copy content to clipboard
   - Double-click card: Enter edit mode
   - After editing, click blank area: Auto-save and copy to clipboard
   - When editing, clicking other cards: Auto-save current edit (no copy, avoid copying wrong card content)

### Interface Description

#### PC Interface
- **Display Control Area**: Shows connection info, IP address, port, QR code
  - Auto-hide QR code when mobile connects
  - Auto-show QR code when mobile disconnects
- **History Card Area**: Shows all segmented history cards
- **Current Input Area**: Shows currently inputting content in real-time

#### Mobile Interface
- **Full-screen Input Box**: Supports multi-line input
- **Auto Line Break**: Optimizes mobile input experience
- **Status Indicator**: Shows connection status, input status

## ❓ FAQ

### Q1: Mobile cannot access PC?

**Possible Causes:**
1. Firewall blocked port 5000
2. Antivirus intercepted connection
3. Mobile and PC not on same network
4. Incorrect IP address

**Solutions:**
1. Check firewall settings, allow port 5000
2. Add program to whitelist in antivirus
3. Confirm mobile and PC on same LAN
4. Use USB shared network (recommended)

### Q2: Prompt "Program is already running"?

**Possible Cause:**
- Lock file not cleaned after program crash

**Solution:**
- Program will auto-detect and cleanup stale lock files
- If still cannot start, manually delete lock file:
  - Windows: `%TEMP%\airinputlan_main.lock`
  - Linux/macOS: `/tmp/airinputlan_main.lock`

### Q3: Multiple network cards detected, which one to choose?

**Recommendation:**
1. Prefer "Ethernet" type network cards
2. If USB shared network available, select USB network card
3. Avoid virtual network cards (unless running in virtual machine)

### Q4: How to save after editing?

**Operations:**
1. Click other cards: Auto-save current edit (no copy, avoid copying wrong card content)
2. Click blank area: Auto-save current edit and copy to clipboard
3. Content will be auto-copied to clipboard after save (when clicking blank area)

### Q5: Does it support multiple devices simultaneously?

**Design Intent:**
- Does not support multiple devices simultaneously
- Only allows one mobile device at a time

**Current Status (Known Bug):**
- Bug exists, allows multiple mobile devices to connect simultaneously
- Will be fixed in future version to support single device only

## ⚠️ Important Notes

- **LAN Only** - Does not support cross-subnet or external network connections
- **LAN Only** - Does not support cross-subnet or external network connections
- **Single Device Limit** - Only allows one mobile device at a time
- **Data Security** - In-memory only, data cleared on exit
- **Firewall** - Need to open firewall port on first use
- **Antivirus** - Some antivirus may need to add to whitelist
- **Browser Compatibility** - Mobile supports Chrome, Edge, Safari, Firefox mainstream browsers
- **QR Code Generation** - Depends on network, uses third-party website API, requires PC to access external network. If PC has no external network connection, you can manually enter IP address and port in mobile browser (e.g., `http://192.168.1.10:5000`)- **Data Security** - In-memory only, data cleared on exit
- **Firewall** - Need to open firewall port on first use
- **Antivirus** - Some antivirus may need to add to whitelist
- **Browser Compatibility** - Mobile supports Chrome, Edge, Safari, Firefox mainstream browsers
- **QR Code Generation** - Depends on network, uses third-party website API, requires PC to access external network

## 🐛 Known Issues

- **Multi-device Connection Bug** - Current version has bug, allows multiple mobile devices to connect simultaneously (design should support single device only), will be fixed in future version
- **Lock File Not Cleaned** - After program abnormal crash, lock file may not be cleaned, causing "Program is already running" prompt, program will auto-detect and cleanup stale lock files

## 🔧 Network Configuration

### Network Card Priority

Program automatically scans all available network cards and sorts by priority:

1. **Ethernet** (Local Connection) - Most likely correct
2. **USB Shared Network** - Second choice
3. **WiFi** - Third choice
4. **Virtual Network** (VMware, VirtualBox, Hyper-V, etc.) - Last, but still usable

### Virtual Network Card Recognition

Program recognizes the following virtual network card types:
- **Container Networks**: virbr, veth, docker, br-, tun, tap, lxc, lxd, podman, flannel, cni
- **VMware**: vmnet, vmware
- **VirtualBox**: vbox, vnic
- **Hyper-V**: vEthernet
- **KVM/QEMU**: kvm, qemu

### Port Configuration

- Default starting port: `5000`
- Max retry count: `100` (5000-5099)
- Auto adaptation: If port is occupied, automatically try next port

### Firewall Configuration

If mobile cannot access, check firewall settings:

#### Windows Firewall
When running program for the first time, Windows will show firewall prompt, click "Allow" to let AirInputLan pass through firewall.

#### Linux Firewall (firewalld)
For RedHat, Fedora, Rocky Linux, CentOS distributions:
```bash
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

#### Linux Firewall (ufw)
For Debian, Ubuntu, Linux Mint distributions:
```bash
sudo ufw allow 5000/tcp
```

#### macOS Firewall
1. Open "System Preferences" → "Security & Privacy" → "Firewall"
2. Click "Firewall Options"
3. Add `AirInputLan` and allow incoming connections

## 🔍 Troubleshooting

### Port Occupied

**Symptom:** Program fails to start, prompts port occupied

**Solution:**
1. Program will automatically try next port (5001, 5002...)
2. Manually release program occupying port 5000
3. Use `netstat -ano | findstr :5000` (Windows) to check occupying process

### Network Connection Timeout

**Symptom:** Mobile access address timeout

**Solution:**
1. Check if mobile and PC on same network
2. Try using USB shared network
3. Check firewall and antivirus settings
4. Try changing port

### QR Code Cannot Scan

**Symptom:** Mobile cannot scan QR code

**Solution:**
1. Manually enter displayed address
2. Confirm QR code is clearly visible
3. Check mobile camera permission
4. Try using other scanning apps

### Clipboard Cannot Copy

**Symptom:** Cannot paste after clicking card

**Solution:**
1. Confirm browser clipboard permission (some browsers require user authorization)
2. Check if other programs occupy clipboard
3. Copy again
4. Try using other browsers

## 🔨 Build Instructions

### Unified Build Script

Use unified build script, auto-detect current platform and build:

```bash
cd go-v1
./scripts/build_all.sh
```

Build artifacts located in `dist/<platform>/` directory.

### Manual Build

#### Linux
```bash
cd go-v1
./scripts/build_linux.sh
chmod +x dist/linux/AirInputLan
./dist/linux/AirInputLan
```

#### Windows
```bash
cd go-v1
scripts\build_windows.bat
dist\windows\AirInputLan.exe
```

#### macOS
```bash
cd go-v1
./scripts/build_macos.sh
./dist/macos/AirInputLan
```

### Build Requirements

- Go 1.21 or higher
- UPX (optional, for compressing executable)

## 🛠 Tech Stack

- **Language**: Go 1.21+
- **Network Protocol**: HTTP + SSE (Server-Sent Events)
- **Frontend**: Native HTML/CSS/JavaScript
- **Cross-platform**: Static compilation (no external dependencies)

## 📁 Project Structure

```
go-v1/
├── internal/           # Internal modules
│   ├── netif/         # Network card scanning and recognition
│   │   ├── scanner.go # Network card scanning implementation
│   │   └── types.go   # Type definitions
│   ├── network/       # Network services
│   │   ├── http.go    # HTTP service
│   │   ├── port.go    # Port adaptation
│   │   ├── qrcode.go  # QR code generation
│   │   └── sse.go     # SSE service
│   ├── state/         # State management
│   │   └── content.go # Content state and auto-segmentation
│   └── singleinstance/ # Single instance lock
│       ├── lock.go          # Unix lock implementation
│       ├── lock_common.go   # Common lock
│       └── lock_windows.go  # Windows lock
├── web/               # Frontend resources
│   ├── pc/            # PC interface
│   │   └── index.html
│   └── mobile/        # Mobile interface
│       └── index.html
├── scripts/           # Build scripts
│   ├── build_all.sh   # Unified build
│   ├── build_linux.sh # Linux build
│   ├── build_macos.sh # macOS build
│   └── build_windows.sh # Windows build
├── dist/              # Build artifacts
│   ├── linux/
│   ├── macos/
│   └── windows/
├── main.go            # Main program
├── go.mod             # Go module
└── README.md          # This file
```

## 📦 Version History

### v1.0.33 (Current Version)

**New Features:**
- ✅ Network card priority optimization (Ethernet > USB Shared > WiFi > Virtual)
- ✅ Enhanced virtual network card recognition (VMware, VirtualBox, Hyper-V, KVM/QEMU, etc.)
- ✅ Windows single instance lock fix (auto-cleanup stale locks)
- ✅ Added debug logs and CORS headers
- ✅ Firewall configuration tips
- ✅ Bilingual code comments (Chinese first, English supplement)
- ✅ Function naming standardization (WebSocket → SSE)

**Code Optimization:**
- 🧹 Removed unused clipboard module (clipboard functionality implemented by browser)
- 🧹 Removed unused security module
- 🧹 Removed unused functions (SendToCurrent, GetUsbShareIp, etc.)
- 🧹 Cleaned up unused imports

**Bug Fixes:**
- 🐛 Fixed Windows unable to start after crash
- 🐛 Fixed USB network card priority too high
- 🐛 Optimized virtual network card recognition

### v1.0.32

- Initial stable version
- Basic features complete

## 📄 License

MIT License

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

## 📧 Contact

For questions or suggestions, please submit an Issue.
