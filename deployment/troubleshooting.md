# 服務啟動故障排除指南

## 常見問題和解決方案

### 1. 服務啟動失敗（exit code 1）

#### 檢查服務日誌
```bash
# 查看詳細錯誤日誌
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -n 50 --no-pager

# 查看實時日誌
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -f
```

#### 檢查文件日誌
```bash
# 查看錯誤日誌文件
sudo tail -f /var/log/uvicorn/chat-ai-tracks-error.log

# 查看訪問日誌
sudo tail -f /var/log/uvicorn/chat-ai-tracks-access.log
```

### 2. 常見錯誤原因

#### A. 路徑問題
- **檢查工作目錄是否存在**：
```bash
ls -la /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
```

- **檢查虛擬環境是否存在**：
```bash
ls -la /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend/.venv/bin/gunicorn
```

#### B. 權限問題
- **檢查用戶權限**：
```bash
# 確認用戶存在
id ai-tracks-chat

# 檢查目錄權限
ls -ld /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
```

- **修復權限**（如果需要）：
```bash
sudo chown -R ai-tracks-chat:ai-tracks-chat /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
```

#### C. 依賴問題
- **檢查 gunicorn 是否安裝**：
```bash
# 以 ai-tracks-chat 用戶身份檢查
su - ai-tracks-chat
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
source .venv/bin/activate
which gunicorn
gunicorn --version
```

- **手動測試啟動**：
```bash
# 以 ai-tracks-chat 用戶身份
su - ai-tracks-chat
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
source .venv/bin/activate
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8097
```

#### D. Python 環境問題
- **檢查 Python 版本**：
```bash
/home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend/.venv/bin/python --version
```

- **檢查 main.py 是否存在**：
```bash
ls -la /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend/main.py
```

#### E. 資料庫連接問題
- **檢查資料庫配置**：
```bash
# 查看配置文件
cat /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend/app/config.py
```

- **測試資料庫連接**：
```bash
# 以 ai-tracks-chat 用戶身份
su - ai-tracks-chat
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
source .venv/bin/activate
python -c "from app.database import engine; engine.connect()"
```

### 3. 調試步驟

#### 步驟 1：查看完整錯誤信息
```bash
sudo journalctl -u chat-ai-tracks-com-uvicorn-gunicorn.service -n 100 --no-pager
```

#### 步驟 2：手動測試服務配置
```bash
# 切換到服務用戶
su - ai-tracks-chat

# 進入工作目錄
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend

# 激活虛擬環境
source .venv/bin/activate

# 測試 gunicorn 命令（使用 service 文件中的完整命令）
/home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend/.venv/bin/gunicorn \
    main:app \
    -w 2 \
    -k uvicorn.workers.UvicornWorker \
    -b 127.0.0.1:8097 \
    --timeout 120
```

#### 步驟 3：檢查環境變量
```bash
# 檢查 PATH
echo $PATH

# 檢查 Python 路徑
which python
python --version
```

### 4. 修復建議

#### 如果 gunicorn 未安裝
```bash
su - ai-tracks-chat
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
source .venv/bin/activate
uv add gunicorn
# 或
pip install gunicorn
```

#### 如果虛擬環境有問題
```bash
su - ai-tracks-chat
cd /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
uv sync
```

#### 如果權限有問題
```bash
sudo chown -R ai-tracks-chat:ai-tracks-chat /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend
sudo chmod +x /home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend/.venv/bin/gunicorn
```

### 5. 驗證修復

修復後，重新啟動服務：
```bash
sudo systemctl daemon-reload
sudo systemctl restart chat-ai-tracks-com-uvicorn-gunicorn.service
sudo systemctl status chat-ai-tracks-com-uvicorn-gunicorn.service
```

