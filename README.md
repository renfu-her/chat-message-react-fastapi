# Chat Message Application

一個基於 React + FastAPI 的現代化即時聊天應用程式，支持多房間聊天、用戶管理、實時消息推送等功能。

## 📋 專案簡介

這是一個全棧即時聊天應用程式，提供以下核心功能：

- **即時聊天**：支持多房間聊天，實時消息推送
- **用戶認證**：JWT 認證機制，安全的登入/註冊系統
- **房間管理**：公開房間和私有房間（密碼保護）
- **用戶關係**：收藏用戶、封鎖用戶功能
- **實時通信**：WebSocket 支持，實時更新用戶狀態和消息
- **消息搜索**：全局消息歷史搜索功能
- **個人設置**：用戶資料管理、頭像上傳（自動轉換為 WebP 格式）

## 🛠️ 技術棧

### 前端 (Frontend)
- **框架**：React 19 + TypeScript
- **構建工具**：Vite
- **樣式**：Tailwind CSS
- **圖標**：Lucide React
- **包管理器**：pnpm
- **圖像處理**：客戶端 WebP 轉換

### 後端 (Backend)
- **框架**：FastAPI
- **資料庫**：MySQL (使用 SQLAlchemy ORM)
- **認證**：JWT (python-jose)
- **密碼加密**：bcrypt
- **實時通信**：WebSocket
- **依賴管理**：uv (Python 3.12+)

## 📁 專案結構

```
chat-message/
├── frontend/          # React 前端應用
│   ├── components/    # React 組件
│   ├── services/      # API 服務和工具
│   └── types.ts       # TypeScript 類型定義
├── backend/           # FastAPI 後端應用
│   ├── app/           # 應用核心代碼
│   │   ├── routers/   # API 路由
│   │   ├── models.py  # 資料庫模型
│   │   ├── schemas.py # Pydantic 模式
│   │   └── websocket.py # WebSocket 處理
│   └── main.py        # 應用入口
├── deployment/        # 部署配置
│   └── uvicorn-gunicorn.service # Systemd service 文件
└── README.md          # 本文件
```

## 🚀 快速開始

### 前置要求

- **Node.js** 18+ 和 **pnpm**
- **Python** 3.12+
- **MySQL** 5.7+ 或 8.0+
- **uv** (Python 包管理器)

### 安裝步驟

#### 1. 後端設置

```bash
cd backend

# 安裝依賴
uv sync

# 初始化資料庫
uv run python init_db.py

# 啟動開發服務器
uv run python main.py
```

後端服務將在 `http://localhost:8000` 啟動。

#### 2. 前端設置

```bash
cd frontend

# 安裝依賴
pnpm install

# 啟動開發服務器
pnpm dev
```

前端應用將在 `http://localhost:3000` 啟動。

## 📚 API 文檔

啟動後端服務後，可以訪問：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 主要功能

### 認證系統
- 用戶註冊/登入
- JWT Token 認證
- 登入驗證碼（數學題）

### 房間管理
- 創建公開/私有房間
- 加入房間（私有房間需要密碼）
- 刪除房間（僅創建者）

### 聊天功能
- 發送文字消息
- 發送圖片（自動轉換為 WebP）
- 實時消息推送
- 消息歷史記錄

### 用戶管理
- 用戶列表
- 收藏用戶
- 封鎖/解封用戶
- 個人資料管理

### 搜索功能
- 搜索用戶
- 搜索全局消息歷史

## 🌐 生產環境部署

詳細的部署說明請參考 [deployment/README.md](deployment/README.md)

### 快速部署

1. 複製 systemd service 文件：
```bash
sudo cp deployment/uvicorn-gunicorn.service /etc/systemd/system/
```

2. 啟動服務：
```bash
sudo systemctl daemon-reload
sudo systemctl start uvicorn-gunicorn.service
sudo systemctl enable uvicorn-gunicorn.service
```

服務將在 `127.0.0.1:8097` 上運行。

## 📝 開發說明

### 資料庫配置

預設配置（可在 `backend/app/config.py` 或環境變數中修改）：
- **Host**: localhost
- **Port**: 3306
- **User**: root
- **Password**: (空)
- **Database**: chat-react-fastapi

### 環境變數

可以在 `backend/.env` 文件中設置：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=chat-react-fastapi
SECRET_KEY=your-secret-key-here
```

## 📄 許可證

本專案僅供學習和開發使用。

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

