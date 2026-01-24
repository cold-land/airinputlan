#!/bin/bash
cd "$(dirname "$0")/.."
upx --best --lzma dist/AirInputLan-x86_64-linux
upx --best --lzma dist/AirInputLan-arm64-linux
upx --best --lzma dist/AirInputLan-x86_64-win.exe
echo "压缩完成"