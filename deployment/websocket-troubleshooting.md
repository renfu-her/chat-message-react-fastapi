# WebSocket 故障排除指南

## 問題描述

在生產環境 `https://chat.ai-tracks.com` 中，WebSocket 連接無法正常工作，但在本地 `localhost` 環境中正常。

## 檢查清單

### 1. 檢查後端服務是否運行

```bash
# 檢查 systemd 服務狀態
sudo systemctl status chat-ai-tracks-com-uvicorn-gunicorn.service

# 檢查後端日誌
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -n 50 --no-pager

# 檢查後端是否監聽正確的端口
sudo netstat -tlnp | grep 8097
# 或使用
sudo ss -tlnp | grep 8097
```

### 2. 檢查 Nginx 配置

```bash
# 測試 Nginx 配置
sudo nginx -t

# 檢查 Nginx 錯誤日誌
sudo tail -f /var/log/nginx/chat.ai-tracks.com-error.log

# 檢查 Nginx 訪問日誌
sudo tail -f /var/log/nginx/chat.ai-tracks.com-access.log
```

### 3. 檢查前端環境變量

確保生產環境的前端構建使用了正確的環境變量：

```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend

# 檢查 .env.production 文件
cat .env.production

# 應該包含：
# VITE_API_BASE_URL=https://chat.ai-tracks.com/api
# VITE_WS_BASE_URL=wss://chat.ai-tracks.com
```

### 4. 檢查 WebSocket 端點

在瀏覽器控制台中檢查 WebSocket 連接：

```javascript
// 打開瀏覽器開發者工具，在 Console 中執行：
const ws = new WebSocket('wss://chat.ai-tracks.com/ws?token=YOUR_TOKEN');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (error) => console.error('WebSocket error:', error);
ws.onclose = (event) => console.log('WebSocket closed:', event.code, event.reason);
```

### 5. 測試後端 WebSocket 端點

```bash
# 直接測試後端 WebSocket（繞過 Nginx）
# 需要先獲取 token，然後使用 wscat 或類似工具
# 安裝 wscat: npm install -g wscat
wscat -c ws://127.0.0.1:8097/ws?token=YOUR_TOKEN
```

## 常見問題和解決方案

### 問題 1: Nginx 沒有正確代理 WebSocket

**症狀**: WebSocket 連接立即失敗或返回 404

**解決方案**: 確保 Nginx 配置包含以下關鍵設置：

```nginx
location /ws {
    proxy_pass http://127.0.0.1:8097/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... 其他配置
}
```

**驗證**:
```bash
# 重新加載 Nginx
sudo systemctl reload nginx

# 檢查配置是否生效
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
     https://chat.ai-tracks.com/ws
```

### 問題 2: 前端使用錯誤的 WebSocket URL

**症狀**: 前端嘗試連接到 `ws://localhost:8000` 而不是 `wss://chat.ai-tracks.com`

**解決方案**: 
1. 確保 `.env.production` 文件存在並配置正確
2. 重新構建前端：
```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend
pnpm build
```

3. 檢查構建後的代碼是否包含正確的 URL：
```bash
# 在構建後的 dist 目錄中搜索
grep -r "wss://chat.ai-tracks.com" dist/
# 或
grep -r "ws://localhost" dist/
```

### 問題 3: SSL/TLS 證書問題

**症狀**: WebSocket 連接在 HTTPS 環境中失敗

**解決方案**: 確保：
1. SSL 證書正確配置
2. Nginx 正確處理 WebSocket 升級請求
3. 使用 `wss://` 而不是 `ws://` 在 HTTPS 環境中

### 問題 4: 後端服務未運行或崩潰

**症狀**: WebSocket 連接超時或連接被拒絕

**解決方案**:
```bash
# 重啟後端服務
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service

# 檢查服務狀態
sudo systemctl status chat-ai-tracks-com-uvicorn-gunicorn.service

# 查看詳細日誌
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -f
```

### 問題 5: 防火牆阻止連接

**症狀**: 無法連接到後端端口

**解決方案**:
```bash
# 檢查防火牆規則
sudo ufw status
# 或
sudo iptables -L -n

# 確保本地端口 8097 可以訪問（不需要對外開放，因為通過 Nginx）
```

## 調試步驟

### 步驟 1: 驗證後端 WebSocket 端點

```bash
# 在服務器上直接測試後端
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  http://127.0.0.1:8097/ws?token=YOUR_TOKEN
```

### 步驟 2: 驗證 Nginx WebSocket 代理

```bash
# 從外部測試（需要有效的 token）
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  https://chat.ai-tracks.com/ws?token=YOUR_TOKEN
```

### 步驟 3: 檢查瀏覽器網絡請求

1. 打開瀏覽器開發者工具 (F12)
2. 切換到 Network 標籤
3. 過濾 "WS" (WebSocket)
4. 嘗試登入應用
5. 查看 WebSocket 連接請求：
   - 狀態碼應該是 `101 Switching Protocols`
   - 如果看到 `404` 或 `502`，檢查 Nginx 和後端配置
   - 如果看到 `403`，檢查 CORS 和認證配置

## 快速修復命令

如果所有配置都正確但仍然無法工作，嘗試以下步驟：

```bash
# 1. 重啟後端服務
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service

# 2. 重新加載 Nginx
sudo systemctl reload nginx

# 3. 檢查服務狀態
sudo systemctl status chat-ai-tracks-com-uvicorn-gunicorn.service
sudo systemctl status nginx

# 4. 查看實時日誌
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -f &
sudo tail -f /var/log/nginx/chat.ai-tracks.com-error.log
```

## 驗證 WebSocket 是否正常工作

在瀏覽器控制台中執行以下代碼（需要先登入獲取 token）：

```javascript
// 獲取 token
const token = localStorage.getItem('chat_token');

// 創建 WebSocket 連接
const ws = new WebSocket(`wss://chat.ai-tracks.com/ws?token=${token}`);

ws.onopen = () => {
  console.log('✅ WebSocket connected successfully');
};

ws.onmessage = (event) => {
  console.log('📨 Message received:', JSON.parse(event.data));
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log('🔌 WebSocket closed:', event.code, event.reason);
};
```

如果連接成功，應該看到 `✅ WebSocket connected successfully`。

