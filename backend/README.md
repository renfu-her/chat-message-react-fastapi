# Chat Backend API

FastAPI 後端服務，為 React 聊天應用提供 RESTful API 和 WebSocket 支持。

## 技術棧

- **框架**: FastAPI 0.115.0
- **資料庫**: MySQL (使用 SQLAlchemy ORM)
- **認證**: JWT (python-jose)
- **密碼加密**: bcrypt (passlib)
- **WebSocket**: FastAPI WebSocket 支持

## 功能特性

- ✅ 用戶認證（登入/註冊/登出）
- ✅ JWT Token 認證
- ✅ Room 管理（創建/加入/刪除）
- ✅ 即時消息（REST API + WebSocket）
- ✅ 用戶關係管理（收藏/封鎖）
- ✅ 消息搜索
- ✅ 私有房間密碼保護

## 安裝與設置

### 前置要求

- Python 3.10+
- [uv](https://github.com/astral-sh/uv) - 快速 Python 包管理器

安裝 uv:
```bash
# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 1. 安裝依賴

使用 uv 安裝項目依賴：

```bash
cd backend
uv sync
```

這會自動：
- 創建虛擬環境（如果不存在）
- 安裝所有依賴包
- 安裝開發依賴（可選）

### 2. 配置環境變量

複製 `.env.example` 為 `.env` 並修改配置：

```bash
cp .env.example .env
```

編輯 `.env` 文件，設置資料庫連接信息：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=chat-react-fastapi
SECRET_KEY=your-secret-key-here
```

### 3. 創建資料庫

確保 MySQL 服務正在運行，然後執行初始化腳本：

```bash
uv run python init_db.py
```

這會：
- 創建資料庫（如果不存在）
- 創建所有資料表
- 插入初始測試數據（5 個測試用戶和 3 個房間）

### 4. 啟動服務

使用 uv 運行：

```bash
uv run python main.py
```

或使用 uvicorn：

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

也可以直接激活虛擬環境後運行：

```bash
# 激活虛擬環境（uv 會自動創建在 .venv）
source .venv/bin/activate  # Linux/macOS
# 或
.venv\Scripts\activate  # Windows

python main.py
```

服務將在 `http://localhost:8000` 啟動。

## API 文檔

啟動服務後，訪問以下 URL 查看自動生成的 API 文檔：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端點

### 認證 (Authentication)

- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/logout` - 用戶登出
- `GET /api/auth/me` - 獲取當前用戶信息

### 用戶 (Users)

- `GET /api/users` - 獲取所有用戶列表
- `PUT /api/users/{user_id}/profile` - 更新個人資料
- `POST /api/users/{user_id}/favorites/{target_id}` - 切換收藏狀態
- `POST /api/users/{user_id}/block/{target_id}` - 封鎖用戶
- `POST /api/users/{user_id}/unblock/{target_id}` - 解封用戶

### 房間 (Rooms)

- `GET /api/rooms` - 獲取所有房間列表
- `POST /api/rooms` - 創建新房間
- `POST /api/rooms/{room_id}/join` - 加入房間（驗證密碼）
- `DELETE /api/rooms/{room_id}` - 刪除房間（僅創建者）

### 消息 (Messages)

- `GET /api/messages/rooms/{room_id}` - 獲取房間的所有消息
- `POST /api/messages` - 發送消息
- `GET /api/messages/search?query=xxx` - 搜索消息歷史

### WebSocket

- `WS /ws?token={jwt_token}` - WebSocket 連接

## WebSocket 事件

服務器會通過 WebSocket 推送以下事件：

### NEW_MESSAGE
新消息到達時推送：
```json
{
  "type": "NEW_MESSAGE",
  "payload": {
    "id": "message_id",
    "roomId": "room_id",
    "senderId": "user_id",
    "senderName": "User Name",
    "senderAvatar": "avatar_url",
    "content": "message content",
    "type": "text",
    "timestamp": "2025-01-27T10:00:00"
  }
}
```

### ROOM_CREATED
新房間創建時推送：
```json
{
  "type": "ROOM_CREATED",
  "payload": {
    "id": "room_id",
    "name": "Room Name",
    "isPrivate": false,
    "createdBy": "user_id",
    "description": "Room description"
  }
}
```

### ROOM_DELETED
房間刪除時推送：
```json
{
  "type": "ROOM_DELETED",
  "payload": {
    "roomId": "room_id"
  }
}
```

### USER_UPDATE
用戶信息更新時推送：
```json
{
  "type": "USER_UPDATE",
  "payload": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "avatar": "avatar_url",
    "isOnline": true,
    "bio": "User bio",
    "favorites": ["user_id1", "user_id2"],
    "blocked": ["user_id3"]
  }
}
```

### USER_JOINED
新用戶註冊時推送：
```json
{
  "type": "USER_JOINED",
  "payload": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "avatar": "avatar_url",
    "isOnline": true,
    "favorites": [],
    "blocked": []
  }
}
```

### USER_LEFT
用戶離線時推送：
```json
{
  "type": "USER_LEFT",
  "payload": {
    "userId": "user_id"
  }
}
```

## 認證方式

所有需要認證的 API 端點都需要在請求頭中包含 JWT token：

```
Authorization: Bearer {jwt_token}
```

登入或註冊成功後，會返回 `access_token`，前端需要保存並在後續請求中使用。

## 測試帳號

初始化腳本會創建以下測試帳號：

| Email | Password |
|-------|----------|
| user1@test.com | password123 |
| user2@test.com | password123 |
| user3@test.com | password123 |
| user4@test.com | password123 |
| user5@test.com | password123 |

## 資料庫結構

### users 表
- id (UUID)
- name
- email (unique)
- password_hash
- avatar
- is_online
- bio
- created_at
- updated_at

### rooms 表
- id (UUID)
- name
- is_private
- password_hash (僅私有房間)
- created_by (外鍵到 users.id)
- description
- created_at
- updated_at

### messages 表
- id (UUID)
- room_id (外鍵到 rooms.id)
- sender_id (外鍵到 users.id)
- sender_name (冗余字段)
- sender_avatar (冗余字段)
- content
- type ('text' or 'image')
- timestamp

### user_relationships 表
- id (UUID)
- user_id (外鍵到 users.id)
- target_id (外鍵到 users.id)
- relationship_type ('favorite' or 'blocked')
- created_at

## 開發說明

### 使用 uv 管理依賴

添加新依賴：
```bash
uv add package-name
```

添加開發依賴：
```bash
uv add --dev package-name
```

移除依賴：
```bash
uv remove package-name
```

更新所有依賴：
```bash
uv sync --upgrade
```

### 項目結構

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py          # 配置管理
│   ├── database.py        # 資料庫連接
│   ├── models.py          # SQLAlchemy 模型
│   ├── schemas.py         # Pydantic 模式
│   ├── auth.py            # 認證工具函數
│   ├── dependencies.py    # 依賴注入
│   ├── websocket.py       # WebSocket 管理
│   └── routers/           # API 路由
│       ├── __init__.py
│       ├── auth.py
│       ├── users.py
│       ├── rooms.py
│       └── messages.py
├── main.py                # 應用入口
├── init_db.py             # 資料庫初始化腳本
├── pyproject.toml         # 項目配置（uv 使用）
├── uv.lock                # 依賴鎖定文件（自動生成）
├── .python-version        # Python 版本
├── .env.example          # 環境變量示例
└── README.md             # 本文檔
```

**注意**: `requirements.txt` 已不再需要，所有依賴定義在 `pyproject.toml` 中。如果需要生成 `requirements.txt`，可以使用：
```bash
uv pip compile pyproject.toml -o requirements.txt
```

## 注意事項

1. **生產環境**: 請務必修改 `SECRET_KEY` 為強隨機字符串
2. **資料庫密碼**: 生產環境請使用強密碼
3. **CORS**: 根據實際前端域名調整 CORS 配置
4. **WebSocket**: 確保 WebSocket 連接使用正確的 token 參數

## 故障排除

### 資料庫連接失敗
- 檢查 MySQL 服務是否運行
- 確認資料庫配置正確
- 確認用戶有創建資料庫的權限

### WebSocket 連接失敗
- 確認 token 有效
- 檢查 CORS 配置
- 查看服務器日誌

## 授權

本項目僅供學習和開發使用。

