# uv 安裝和 PATH 配置指南

## 問題

安裝 `uv` 後，需要將 `$HOME/.local/bin` 添加到 PATH 環境變量中，才能在任何地方使用 `uv` 命令。

## 解決方案

### 方法 1：臨時添加（當前會話有效）

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### 方法 2：永久添加（推薦）

根據你使用的 shell，選擇對應的配置文件：

#### 對於 Bash（最常見）

```bash
# 編輯 ~/.bashrc
nano ~/.bashrc
# 或
vim ~/.bashrc

# 在文件末尾添加：
export PATH="$HOME/.local/bin:$PATH"

# 保存後重新加載
source ~/.bashrc
```

#### 對於 Zsh

```bash
# 編輯 ~/.zshrc
nano ~/.zshrc

# 在文件末尾添加：
export PATH="$HOME/.local/bin:$PATH"

# 保存後重新加載
source ~/.zshrc
```

#### 對於所有 Shell（通用方法）

```bash
# 編輯 ~/.profile
nano ~/.profile

# 在文件末尾添加：
export PATH="$HOME/.local/bin:$PATH"

# 保存後重新加載
source ~/.profile
```

### 方法 3：使用安裝程序提供的腳本

```bash
# 對於 bash/zsh
source $HOME/.local/bin/env

# 對於 fish shell
source $HOME/.local/bin/env.fish
```

但這只是臨時生效，要永久生效還是需要添加到配置文件中。

## 檢查當前 Shell

```bash
echo $SHELL
```

## 驗證安裝

```bash
# 檢查 uv 是否在 PATH 中
which uv

# 檢查 uv 版本
uv --version
```

## 推薦配置

對於服務器環境，建議使用 `~/.bashrc`（如果使用 bash）或 `~/.profile`（通用）：

```bash
# 添加到 ~/.bashrc 或 ~/.profile
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## 修復 .bashrc 中的錯誤

如果 `.bashrc` 中有引用 `~/.local/bin/env` 但文件不存在，會出現錯誤：

```
-bash: /home/ai-tracks-chat/.local/bin/env: No such file or directory
```

**解決方法**：

1. **手動修復**：
```bash
# 編輯 .bashrc
nano ~/.bashrc

# 找到並刪除或註釋掉這一行：
# . "$HOME/.local/bin/env"

# 確保有這一行（如果沒有就添加）：
export PATH="$HOME/.local/bin:$PATH"

# 保存後重新加載
source ~/.bashrc
```

2. **使用修復腳本**（推薦）：
```bash
# 下載並執行修復腳本
bash deployment/fix-bashrc.sh
```

3. **快速修復**（一行命令）：
```bash
# 移除不存在的 env 引用，添加 PATH 配置
sed -i '/\. "$HOME\/.local\/bin\/env"/d' ~/.bashrc && \
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && \
source ~/.bashrc
```

## 注意事項

1. **root 用戶**：如果以 root 用戶安裝，`$HOME` 實際上是 `/root`，所以路徑是 `/root/.local/bin`
2. **普通用戶**：如果以普通用戶安裝，`$HOME` 是 `/home/username`，路徑是 `/home/username/.local/bin`
3. **系統級安裝**：如果需要所有用戶都能使用，可以考慮將 `uv` 複製到 `/usr/local/bin`：
   ```bash
   sudo cp $HOME/.local/bin/uv /usr/local/bin/
   ```

## 針對 ai-tracks-chat 用戶

如果要在 `ai-tracks-chat` 用戶下使用 `uv`：

```bash
# 切換到 ai-tracks-chat 用戶
su - ai-tracks-chat

# 安裝 uv（如果還沒安裝）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 添加到 PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 驗證
uv --version
```

