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
- ✅ **Dual-mode Segmentation** - Supports single input mode and continuous input mode
  - **Single Input Mode**: Mobile detects 2 seconds of no input and auto-segments
  - **Continuous Input Mode**: Server detects 2 seconds of no input and auto-segments
- ✅ **Mobile Theme Toggle** - Supports light and dark themes, auto-saves user preference
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
- **Auto Line Break**: Optimized for mobile input experience
- **Status Indicator**: Shows connection status, input status
- **Segmentation Mode Toggle**:
  - **Continuous Input** (switch off): Server controls segmentation, suitable for long text input
  - **Single Input** (switch on): Mobile controls segmentation, suitable for short sentence input
  - Clears current input content when switching modes
- **Theme Toggle**:
  - Supports light and dark themes
  - Click 🌙/☀️ button in top-right corner to switch
  - Auto-saves theme preference to local storage

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

**Design:**
- Input (Mobile): Only one device allowed
- Output (PC): Multiple devices allowed (multiple PCs can view mobile input simultaneously)

## ⚠️ Important Notes

- **LAN Only** - Does not support cross-subnet or external network connections
- **Single Device Limit** - Only allows one mobile device at a time
- **Data Security** - In-memory only, data cleared on exit
- **Firewall** - Need to open firewall port on first use
- **Antivirus** - Some antivirus may need to add to whitelist
- **Browser Compatibility** - Mobile supports Chrome, Edge, Safari, Firefox mainstream browsers
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
cd go-lang
./scripts/build_all.sh
```

Build artifacts located in `dist/` directory, filenames include platform identifier.

### Manual Build

#### Linux
```bash
cd go-lang
./scripts/build_linux.sh
chmod +x dist/AirInputLan-x86_64-linux
./dist/AirInputLan-x86_64-linux
```

#### Windows
```bash
cd go-lang
./scripts/build_windows.sh
dist\AirInputLan-x86_64-win.exe
```

#### macOS
```bash
cd go-lang
./scripts/build_macos.sh
./dist/AirInputLan-x86_64-macos
```

### Compress Build Artifacts

After building, you can use UPX to compress executables:

```bash
cd go-lang
./scripts/compress.sh
```

Compressed file size is approximately 31-32% of original size.

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
go-lang/
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
├── dist/              # Build artifacts
├── main.go            # Main program
├── go.mod             # Go module
└── README.md          # This file
```

## 📦 Version History

### v1.2.0 (Current Version)

**New Features:**
- ✅ Local AI correction feature (requires Ollama support)
  - Add "🤖 AI Correction" button in top-right corner, click to open settings
  - AI correction button appears on left side of each history card (when enabled)
  - Click button to correct card content, automatically copy to clipboard after correction
  - Support configuration export/import (download JSON file)
  - Full memory operation, need to re-import configuration after page refresh

**Important Notes:**
- ⚠️ This feature depends on Ollama service, please ensure Ollama is started and running at http://localhost:11434
- ⚠️ Configuration only valid in current page, configuration will be lost after page refresh, please click "Export Configuration" to save configuration file

### v1.1.2

**New Features:**
- ✅ No internet connection needed (QR code generated locally, removed external API dependency)
- ✅ Fast exit optimization (Exit time reduced from 1-2s to ~250ms)
- ✅ Logging system optimization (All logs changed to Chinese for better readability)

**Bug Fixes:**
- 🐛 Fixed multiple mobile devices connection issue
- 🐛 Fixed port binding race condition
- 🐛 Fixed frontend reconnection logic accumulating timers
- 🐛 Fixed SSE client panic
- 🐛 Fixed input length limit (calculated by character count)
- 🐛 Fixed PC end XSS security vulnerability
- 🐛 Fixed Windows single instance lock invalid issue

### v1.1

**New Features:**
- ✅ Dual-mode segmentation system (Single Input/Continuous Input)
- ✅ Mobile theme switching (Light/Dark)
- ✅ Mobile interface optimization (vertical text, connection status indicator)

**Bug Fixes:**
- 🐛 Fixed QR code always showing after PC page refresh
- 🐛 Fixed double segmentation when switching modes
- 🐛 Fixed mode inconsistency after mobile reconnection

## 📄 License

MIT License

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

## 📧 Contact

For questions or suggestions, please submit an Issue.
