# Deployment Guide

## Systemd Service 配置

### 安裝步驟

1. **創建日誌目錄**：
```bash
sudo mkdir -p /var/log/uvicorn
sudo chown ai-tracks-chat:ai-tracks-chat /var/log/uvicorn
```

2. **安裝 gunicorn**（如果尚未安裝）：
```bash
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
source .venv/bin/activate
pip install gunicorn
# 或使用 uv
uv add gunicorn
```

3. **複製 service 文件**：
```bash
sudo cp deployment/uvicorn-gunicorn.service /etc/systemd/system/
```

4. **重新加載 systemd**：
```bash
sudo systemctl daemon-reload
```

5. **啟動服務**：
```bash
sudo systemctl start uvicorn-gunicorn.service
```

6. **設置開機自啟**：
```bash
sudo systemctl enable uvicorn-gunicorn.service
```

7. **檢查服務狀態**：
```bash
sudo systemctl status uvicorn-gunicorn.service
```

### 常用命令

- **查看日誌**：
```bash
sudo journalctl -u uvicorn-gunicorn.service -f
# 或查看文件日誌
tail -f /var/log/uvicorn/chat-react-access.log
tail -f /var/log/uvicorn/chat-react-error.log
```

- **重啟服務**：
```bash
sudo systemctl restart uvicorn-gunicorn.service
```

- **停止服務**：
```bash
sudo systemctl stop uvicorn-gunicorn.service
```

- **重新加載配置**：
```bash
sudo systemctl daemon-reload
sudo systemctl restart uvicorn-gunicorn.service
```

### Nginx 配置示例

在 Nginx 配置中添加反向代理：

```nginx
server {
    listen 80;
    server_name chat.ai-tracks.com;

    location / {
        proxy_pass http://127.0.0.1:8097;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 注意事項

1. **端口配置**：確保 service 文件中的端口（8097）與 Nginx 配置一致
2. **用戶權限**：確保 `ai-tracks-chat` 用戶有權限訪問項目目錄和日誌目錄
3. **環境變量**：如果需要環境變量，可以在 `[Service]` 部分添加 `Environment` 指令
4. **Workers 數量**：根據服務器 CPU 核心數調整 `-w` 參數（建議為 CPU 核心數 * 2）

