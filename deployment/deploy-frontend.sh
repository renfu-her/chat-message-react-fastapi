#!/bin/bash
# Frontend 部署腳本
# 使用 pnpm 構建和部署前端應用

set -e

FRONTEND_DIR="/home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend"

echo "=========================================="
echo "Frontend 部署腳本"
echo "=========================================="

# 檢查目錄是否存在
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "錯誤: 前端目錄不存在: $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR"

# 檢查 pnpm 是否安裝
if ! command -v pnpm &> /dev/null; then
    echo "錯誤: pnpm 未安裝"
    echo "請先安裝 pnpm: curl -fsSL https://get.pnpm.io/install.sh | sh -"
    exit 1
fi

echo "✓ pnpm 已安裝: $(pnpm --version)"

# 安裝依賴
echo ""
echo "正在安裝依賴..."
pnpm install

# 構建生產版本
echo ""
echo "正在構建生產版本..."
pnpm build

# 檢查構建結果
if [ ! -d "dist" ]; then
    echo "錯誤: 構建失敗，dist 目錄不存在"
    exit 1
fi

# 顯示構建結果
echo ""
echo "=========================================="
echo "構建完成！"
echo "=========================================="
echo "構建文件位於: $FRONTEND_DIR/dist"
echo ""
echo "文件列表:"
ls -lh dist/ | head -10
echo ""
echo "總大小:"
du -sh dist/

echo ""
echo "下一步:"
echo "1. 確保 Nginx 配置正確指向: $FRONTEND_DIR/dist"
echo "2. 重新加載 Nginx: sudo systemctl reload nginx"

