# Frontend 部署指南

## 使用 pnpm 構建和部署前端應用

### 前置要求

- **Node.js** 18+ 
- **pnpm**（已安裝）

### 安裝 pnpm（如果尚未安裝）

```bash
# 使用 npm 安裝 pnpm
npm install -g pnpm

# 或使用 curl 安裝
curl -fsSL https://get.pnpm.io/install.sh | sh -

# 驗證安裝
pnpm --version
```

### 構建步驟

1. **進入前端目錄**：
```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend
```

2. **安裝依賴**：
```bash
pnpm install
```

3. **構建生產版本**：
```bash
pnpm build
```

這會生成 `dist/` 目錄，包含所有靜態文件。

4. **驗證構建結果**：
```bash
ls -la dist/
```

### 部署選項

#### 選項 1：使用 Nginx 服務靜態文件（推薦）

構建後，Nginx 會自動服務 `dist/` 目錄中的文件。

**Nginx 配置**（已在 `deployment/nginx.conf` 中配置）：
```nginx
root /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend/dist;

location / {
    try_files $uri $uri/ /index.html;
}
```

**部署流程**：
```bash
# 1. 構建前端
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend
pnpm install
pnpm build

# 2. 確保 Nginx 配置正確
sudo nginx -t

# 3. 重新加載 Nginx
sudo systemctl reload nginx
```

#### 選項 2：使用 Vite Preview（開發/測試）

```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend
pnpm build
pnpm preview --host 0.0.0.0 --port 3000
```

### 更新前端

當需要更新前端時：

```bash
# 1. 進入前端目錄
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend

# 2. 拉取最新代碼（如果使用 Git）
git pull

# 3. 更新依賴（如果有變更）
pnpm install

# 4. 重新構建
pnpm build

# 5. 如果使用 Nginx，重新加載配置
sudo systemctl reload nginx
```

### 環境變量配置

如果需要配置不同的 API 端點，可以：

1. **創建 `.env.production` 文件**：
```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend
nano .env.production
```

內容示例：
```env
VITE_API_BASE_URL=https://chat.ai-tracks.com/api
VITE_WS_BASE_URL=wss://chat.ai-tracks.com
```

2. **重新構建**：
```bash
pnpm build
```

### 檢查構建文件

```bash
# 查看構建輸出
ls -lh /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend/dist

# 檢查文件大小
du -sh /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend/dist
```

### 故障排除

#### 構建失敗

```bash
# 清除緩存和 node_modules
rm -rf node_modules .pnpm-store dist
pnpm install
pnpm build
```

#### 權限問題

```bash
# 確保用戶有權限
sudo chown -R ai-tracks-chat:ai-tracks-chat /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend
```

#### 檢查 pnpm 版本

```bash
pnpm --version
# 應該顯示 8.x 或更高版本
```

### 自動化部署腳本

已準備好部署腳本 `deployment/deploy-frontend.sh`：

**使用方法**：
```bash
# 1. 賦予執行權限
chmod +x deployment/deploy-frontend.sh

# 2. 執行部署腳本
bash deployment/deploy-frontend.sh

# 或直接執行
./deployment/deploy-frontend.sh
```

**腳本功能**：
- 自動檢查 pnpm 是否安裝
- 安裝前端依賴
- 構建生產版本
- 驗證構建結果
- 顯示構建文件信息

**手動部署**（如果不想使用腳本）：
```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend
pnpm install
pnpm build
```

