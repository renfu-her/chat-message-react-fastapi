# Deployment Guide

## Systemd Service 配置

### 安裝步驟

1. **創建日誌目錄**：
```bash
sudo mkdir -p /var/log/uvicorn
sudo chown ai-tracks-chat:ai-tracks-chat /var/log/uvicorn
```

2. **安裝 uv**（如果尚未安裝）：
```bash
# 安裝 uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 將 uv 添加到 PATH（永久）
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# 驗證安裝
uv --version
```

3. **安裝 gunicorn**（如果尚未安裝）：
```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
# 使用 uv 安裝（推薦）
uv add gunicorn
# 或使用傳統方式
source .venv/bin/activate
pip install gunicorn
```

4. **複製 service 文件**：
```bash
sudo cp deployment/chat-ai-tracks-com-uvicorn-gunicorn.service /etc/systemd/system/
```

5. **重新加載 systemd**：
```bash
sudo systemctl daemon-reload
```

6. **啟動服務**：
```bash
sudo systemctl start chat-ai-tracks-com-uvicorn-gunicorn.service
```

7. **設置開機自啟**：
```bash
sudo systemctl enable chat-ai-tracks-com-uvicorn-gunicorn.service
```

8. **檢查服務狀態**：
```bash
sudo systemctl status chat-ai-tracks-com-uvicorn-gunicorn.service
```

### 常用命令

- **查看日誌**：
```bash
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -f
# 或查看文件日誌
tail -f /var/log/uvicorn/chat-ai-tracks-access.log
tail -f /var/log/uvicorn/chat-ai-tracks-error.log
```

- **重啟服務**：
```bash
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service
```

- **停止服務**：
```bash
sudo systemctl stop chat-ai-tracks-com-uvicorn-gunicorn.service
```

- **重新加載配置**：
```bash
sudo systemctl daemon-reload
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service
```

### Nginx 配置

完整的 Nginx 配置文件已準備在 `deployment/nginx.conf`。

**安裝步驟**：

1. **複製配置文件**：
```bash
sudo cp deployment/nginx.conf /etc/nginx/sites-available/chat.ai-tracks.com
sudo ln -s /etc/nginx/sites-available/chat.ai-tracks.com /etc/nginx/sites-enabled/
```

2. **修改配置**（如果需要）：
   - 更新 SSL 證書路徑
   - 確認前端靜態文件路徑：`/home/ai-tracks-chat/htdocs/chat.ai-tracks.com/frontend/dist`
   - 確認後端端口：`127.0.0.1:8097`

3. **測試配置**：
```bash
sudo nginx -t
```

4. **重新加載 Nginx**：
```bash
sudo systemctl reload nginx
```

**配置說明**：
- `/api/` - 後端 API 代理（端口 8097）
- `/ws` - WebSocket 端點（端口 8097）
- `/docs`, `/redoc`, `/openapi.json` - FastAPI 文檔端點
- `/` - 前端靜態文件（React SPA）
- 支持 HTTPS 和 HTTP/2
- 靜態資源緩存優化

### 注意事項

1. **端口配置**：確保 service 文件中的端口（8097）與 Nginx 配置一致
2. **用戶權限**：確保 `ai-tracks-chat` 用戶有權限訪問項目目錄和日誌目錄
3. **環境變量**：如果需要環境變量，可以在 `[Service]` 部分添加 `Environment` 指令
4. **Workers 數量**：根據服務器 CPU 核心數調整 `-w` 參數（建議為 CPU 核心數 * 2）

