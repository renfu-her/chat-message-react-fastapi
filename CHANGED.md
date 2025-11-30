# 變更記錄 (Change Log)

## 2025-11-29 23:34:38

### 修復 Pydantic EmailStr 依賴問題
- **pyproject.toml**: 添加 email-validator 支持
  - 將 `pydantic==2.9.2` 改為 `pydantic[email]==2.9.2`
  - 自動安裝 `email-validator` 和 `dnspython` 依賴
  - 解決 `ImportError: email-validator is not installed` 錯誤

## 2025-11-29 23:30:10

### 修復資料庫初始化錯誤
- **app/models.py**: 修復 SQLAlchemy 關係警告
  - 為 `favorites_as_user` 和 `blocked_as_user` 添加 `overlaps` 參數
  - 使用 `primaryjoin` 區分收藏和封鎖關係類型
  - 更新 `UserRelationship.user` 關係為 `viewonly=True`
- **app/auth.py**: 完全重寫密碼哈希實現
  - 移除 `passlib` 依賴，直接使用 `bcrypt` 庫
  - 解決 bcrypt 版本兼容性問題（passlib 與新版本 bcrypt 不兼容）
  - 在 `get_password_hash` 函數中添加密碼長度檢查（72 字節限制）
  - 更新 `verify_password` 函數使用 bcrypt 直接驗證
- **pyproject.toml**: 更新依賴
  - 移除 `passlib[bcrypt]==1.7.4`
  - 添加 `bcrypt==4.2.0`

### 問題解決
- 解決了 "relationship will copy column" SQLAlchemy 警告
- 解決了 bcrypt 版本兼容性問題（`AttributeError: module 'bcrypt' has no attribute '__about__'`）
- 解決了 "password cannot be longer than 72 bytes" bcrypt 錯誤

## 2025-11-29 23:24:27

### Python 版本更新
- **.python-version**: 更新為 Python 3.12
- **pyproject.toml**: 更新 `requires-python` 為 `>=3.12`

## 2025-11-29 23:24:00

### Backend 項目配置更新
- **pyproject.toml**: 創建 uv 項目配置文件
  - 定義所有 Python 依賴
  - 配置項目元數據和構建系統
  - 支持開發依賴管理
- **.python-version**: 指定 Python 版本為 3.11
- **.gitignore**: 添加 Python 項目標準忽略文件
- **README.md**: 更新安裝和使用說明，改為使用 uv 管理依賴
  - 添加 uv 安裝說明
  - 更新依賴安裝命令（`uv sync`）
  - 更新運行命令（`uv run`）
  - 添加 uv 常用命令說明

### 變更說明
- 後端項目從使用 `pip` + `requirements.txt` 改為使用 `uv` + `pyproject.toml`
- 所有依賴現在通過 `pyproject.toml` 管理
- 提供更快的依賴安裝和項目管理體驗

## 2025-11-29 23:06:29

### 新增文件
- **frontend-plan.md**: 創建完整的前端開發計劃文檔
  - 包含所有功能模塊的詳細說明
  - 涵蓋認證系統、Room 管理、聊天功能、用戶管理、設置功能、搜索功能等
  - 包含技術棧、數據流、文件結構、類型定義等完整信息
  - 提供功能流程圖和待改進項目清單

### Backend 完整實現
- **backend/**: 創建完整的 FastAPI 後端系統
  - 認證系統（JWT、登入/註冊/登出）
  - Room 管理 API（創建/加入/刪除）
  - 消息 API 和 WebSocket 實時通信
  - 用戶管理 API（收藏/封鎖）
  - 消息搜索功能
  - MySQL 資料庫集成
  - 完整的資料庫模型和初始化腳本

### 內容說明
- 詳細分析了現有的 frontend 代碼結構
- 整理了所有功能的使用流程和實現細節
- 包含登入、註冊、Room 創建/加入/刪除、消息發送、用戶關係管理、搜索、設置等完整功能說明

## 2025-11-29 23:49:15

### 前端連接真實後端 API
- **frontend/services/api.ts**: 創建新的 API 服務文件，替代 `mockBackend.ts`
  - 實現 JWT token 認證機制，自動在請求頭中添加 Authorization
  - 實現 WebSocket 連接管理，支持自動重連（最多 5 次）
  - 所有 API 調用都連接到 `http://localhost:8000/api`
  - WebSocket 連接到 `ws://localhost:8000/ws`
  - 數據格式轉換：將後端的 snake_case 格式轉換為前端的 camelCase 格式
- **frontend/App.tsx**: 更新認證流程
  - 登入、註冊、登出使用真實 API
  - 自動驗證 token 並恢復會話
  - 登入/註冊成功後自動連接 WebSocket
- **frontend/components/ChatApp.tsx**: 更新所有功能使用真實 API
  - 房間管理（獲取、創建、加入、刪除）
  - 消息管理（獲取、發送、搜索）
  - 用戶管理（獲取列表、收藏、封鎖、取消封鎖）
  - 個人資料更新
  - WebSocket 訂閱處理實時更新（新消息、用戶狀態、房間變更等）
- **數據格式轉換**:
  - 後端 `is_private` → 前端 `isPrivate`
  - 後端 `created_by` → 前端 `createdBy`
  - 後端 `is_online` → 前端 `isOnline`
  - 後端 `room_id` → 前端 `roomId`
  - 後端 `sender_id` → 前端 `senderId`
  - 後端 `sender_name` → 前端 `senderName`
  - 後端 `sender_avatar` → 前端 `senderAvatar`
  - 後端 `room_name` → 前端 `roomName`

## 2025-11-30 00:08:00

### 修復聊天消息重複顯示問題
- **frontend/components/ChatApp.tsx**: 防止重複消息
  - 在 `NEW_MESSAGE` WebSocket 事件處理中添加重複檢查
  - 檢查消息 ID 是否已存在，避免重複添加
  - 將消息列表的 key 從 `msg.id || idx` 改為 `msg.id`，確保 React 正確識別重複消息

## 2025-11-30 00:05:00

### 修復用戶在線狀態綠色燈顯示問題
- **frontend/services/api.ts**: 修復數據格式轉換
  - `login()`: 將後端 `is_online` 轉換為前端 `isOnline`
  - `register()`: 將後端 `is_online` 轉換為前端 `isOnline`
  - `getCurrentUser()`: 將後端 `is_online` 轉換為前端 `isOnline`
  - `getUsers()`: 將所有用戶的 `is_online` 轉換為 `isOnline`
  - `updateProfile()`: 將後端 `is_online` 轉換為前端 `isOnline`
- **frontend/components/ChatApp.tsx**: 修復 WebSocket 事件處理
  - `USER_UPDATE` 事件：正確處理 `isOnline` 和 `is_online` 兩種格式
  - `USER_JOINED` 事件：正確處理 `isOnline` 和 `is_online` 兩種格式
  - 確保在線狀態正確顯示綠色指示燈

## 2025-11-29 23:58:00

### 修復登入卡住問題
- **backend/app/routers/auth.py**: 優化登入和註冊流程
  - 將 WebSocket 廣播移到返回響應之後，避免阻塞登入流程
  - 添加 try-except 包裹 WebSocket 廣播，失敗不影響登入
  - 移除登入時的 `broadcast_user_update` 調用（已在返回前執行）
- **backend/app/database.py**: 添加資料庫連接超時配置
  - 添加 `pool_timeout=20` 連接池超時
  - 添加 `connect_timeout=10` MySQL 連接超時
- **frontend/services/api.ts**: 添加請求超時處理
  - 使用 `AbortController` 實現 30 秒請求超時
  - 超時時顯示友好的錯誤消息
  - 改進錯誤處理邏輯

## 2025-11-29 23:52:00

### 修復 WebSocket 連接和認證問題
- **backend/main.py**: 修復 WebSocket 路由註冊
  - 將 `app.add_api_route("/ws", handle_websocket, methods=["GET"])` 改為 `@app.websocket("/ws")` 裝飾器
  - 添加 `WebSocket` 導入
- **backend/app/websocket.py**: 修復 `handle_websocket` 函數簽名
  - 移除不必要的 `token` 參數，只從查詢參數獲取
  - 簡化函數實現
- **frontend/services/api.ts**: 改進錯誤處理
  - 當收到 401/403 錯誤時自動清除 token 和用戶信息
  - 移除模塊加載時的自動 WebSocket 連接（改為在登入/註冊成功後連接）
  - 改進錯誤消息解析
- **frontend/components/ChatApp.tsx**: 改進數據加載邏輯
  - 在加載數據前檢查 token 是否存在
  - 添加更好的錯誤處理和日誌記錄
- **frontend/App.tsx**: 改進會話恢復邏輯
  - 當 token 驗證失敗時清除所有相關數據
  - 確保沒有 token 時不會嘗試恢復會話

## 2025-11-29 23:50:00

### 前端包管理器更新為 pnpm
- **frontend/README.md**: 更新安裝和使用說明
  - 將 `npm install` 改為 `pnpm install`
  - 將 `npm start` 改為 `pnpm dev`
  - 明確說明項目使用 pnpm 作為包管理器

