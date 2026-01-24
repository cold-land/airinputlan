#!/bin/bash

cd "$(dirname "$0")"
bash build_linux.sh
bash build_linux_arm.sh
bash build_macos.sh
bash build_macos_arm.sh
bash build_windows.sh
echo "编译完成"