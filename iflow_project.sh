#!/bin/bash

# iFlow CLI Workflow 项目级安装脚本
# 在项目目录下运行此脚本来安装 Workflow

set -e

echo "=== 开始安装 iFlow CLI Workflow（项目级）==="

# 检查是否在项目目录中
if [ ! -d ".git" ] && [ ! -f "go.mod" ] && [ ! -f "package.json" ]; then
    echo "警告：当前目录似乎不是项目目录"
    echo "建议在项目目录下运行此脚本"
    read -p "是否继续? (y/n): " answer
    if [ "$answer" != "y" ]; then
        exit 0
    fi
fi

# 安装 Workflow
echo ""
echo "=== 安装 Workflow ==="

# 安装 frontend-design workflow
echo "安装 frontend-design workflow (前端设计)..."
iflow workflow add "frontend-design-yrbOpA"

# 安装 commit-commands workflow
echo "安装 commit-commands workflow (Git 提交命令)..."
iflow workflow add "commit-commands-wToNpA"

# 安装 superpowers workflow
echo "安装 superpowers workflow (自动化开发流程)..."
iflow workflow add "superpowers-wfurrA"

echo ""
echo "=== Workflow 安装完成 ==="
echo ""
echo "已安装的 Workflow："
echo "  - frontend-design: 前端设计，创建独特、精美的 UI 界面"
echo "  - commit-commands: Git 提交命令，简化 Git 工作流（/commit、/commit-push-pr、/clean_gone）"
echo "  - superpowers: 自动化开发流程，强调 TDD、YAGNI、DRY 原则"
echo ""
echo "查看已安装的 Workflow："
echo "  使用命令：/workflow"
echo ""
echo "提示："
echo "  - 此脚本应在项目目录下运行"
echo "  - Workflow 仅在当前项目中可用"
echo "  - 如需在其他项目中使用，请在该项目目录下重新运行此脚本"