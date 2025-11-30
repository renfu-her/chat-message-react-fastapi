#!/bin/bash
# 修復 .bashrc 中 uv 的 PATH 配置

# 檢查 uv 是否已安裝
if command -v uv &> /dev/null; then
    echo "✓ uv 已安裝在: $(which uv)"
else
    echo "⚠ uv 未找到，請先安裝 uv"
    echo "執行: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# 備份 .bashrc
cp ~/.bashrc ~/.bashrc.backup.$(date +%Y%m%d_%H%M%S)
echo "✓ 已備份 .bashrc"

# 移除舊的 env 引用（如果存在但文件不存在）
if grep -q '\. "$HOME/.local/bin/env"' ~/.bashrc; then
    if [ ! -f "$HOME/.local/bin/env" ]; then
        echo "⚠ 發現不存在的 ~/.local/bin/env 引用，正在移除..."
        sed -i '/\. "$HOME\/.local\/bin\/env"/d' ~/.bashrc
        echo "✓ 已移除不存在的 env 引用"
    fi
fi

# 檢查是否已有 PATH 配置
if grep -q 'export PATH="\$HOME/.local/bin:\$PATH"' ~/.bashrc; then
    echo "✓ PATH 配置已存在"
else
    # 添加 PATH 配置
    echo '' >> ~/.bashrc
    echo '# Add uv to PATH' >> ~/.bashrc
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    echo "✓ 已添加 PATH 配置"
fi

echo ""
echo "完成！請執行以下命令使配置生效："
echo "  source ~/.bashrc"
echo ""
echo "然後驗證："
echo "  uv --version"

