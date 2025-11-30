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

## 2025-11-30 16:20:00

### 完善後端混合方案支持
- **backend/app/websocket.py**: 添加 WebSocket 心跳檢測支持
  - 處理前端發送的 `ping` 消息
  - 自動回應 `pong` 消息
  - 確保連接保持活躍
- **backend/app/routers/realtime.py**: 優化 Long Polling 端點
  - 支持增量獲取（通過 `lastMessageId` 和 `lastTimestamp`）
  - 首次請求返回初始數據（房間列表、用戶列表）
  - 後續請求只返回新事件，避免重複數據
  - 立即返回響應，客戶端會立即發起下一次請求
- **backend/BACKEND_HYBRID_SETUP.md**: 創建後端配置指南
  - 詳細說明後端需要配合的功能
  - 配置檢查清單
  - 性能優化建議
  - 測試方法

## 2025-11-30 16:15:00

### 實現混合實時連接方案（WebSocket + Long Polling）
- **frontend/services/realtimeConnection.ts**: 創建混合連接管理器
  - 優先使用 WebSocket，失敗時自動降級到 Long Polling
  - 統一的事件接口，上層代碼無需關心底層實現
  - 自動重連機制和心跳檢測
  - 連接狀態管理和監控
- **backend/app/routers/realtime.py**: 創建 Long Polling 備用端點
  - `/api/realtime/poll` - Long Polling 端點，返回新事件
  - `/api/realtime/status` - 獲取實時連接狀態
  - 支持增量獲取（通過 lastMessageId）
- **frontend/services/api.ts**: 添加混合連接接口
  - `subscribeToRealtime()` - 使用混合連接方案（推薦）
  - `getRealtimeStatus()` - 獲取當前連接狀態
  - 保留 `subscribeToSocket()` 以保持向後兼容
- **backend/main.py**: 註冊 realtime 路由
- **frontend/HYBRID_REALTIME_GUIDE.md**: 創建使用指南
  - 詳細的使用說明和示例代碼
  - 工作原理和配置說明
  - 遷移指南和注意事項

## 2025-11-30 16:10:00

### 創建實時通信方案比較文檔
- **backend/REALTIME_COMMUNICATION_OPTIONS.md**: 創建實時通信方案比較文檔
  - 詳細比較 WebSocket、SSE、Long Polling、Short Polling 等方案
  - 分析各方案的優缺點和適用場景
  - 提供實現示例和代碼片段
  - 針對聊天應用提供推薦方案
  - 包含優化建議（心跳檢測、自動重連、消息確認等）
  - 結論：WebSocket 是聊天應用的最佳選擇

## 2025-11-30 16:05:00

### 確認並完善 WebSocket 事件連接
- **backend/app/routers/auth.py**: 添加登入時的 USER_UPDATE 事件
  - 在 `login()` 函數中，登入成功後廣播 `USER_UPDATE` 事件
  - 確保其他用戶能看到該用戶從離線變為在線的狀態
- **backend/WEBSOCKET_EVENTS.md**: 創建 WebSocket 事件文檔
  - 列出所有已實現的 WebSocket 事件
  - 說明每個事件的觸發時機、後端位置、前端處理和事件格式
  - 包含檢查清單確認所有事件都已實現並連接

## 2025-11-30 16:00:00

### 完善用戶離線狀態處理（登出和關閉瀏覽器）
- **backend/app/websocket.py**: 在 WebSocket 斷開時自動更新用戶離線狀態
  - 在 `handle_websocket` 的 `except WebSocketDisconnect` 中，自動更新用戶的 `is_online = False`
  - 廣播 `USER_LEFT` 事件通知其他用戶該用戶已離線
  - 添加數據庫操作和錯誤處理
- **frontend/services/api.ts**: 添加 `markUserOffline` 導出函數
  - 使用 `navigator.sendBeacon` 或 `fetch` with `keepalive` 確保在頁面關閉時也能發送請求
  - 支持在瀏覽器關閉時標記用戶離線
- **frontend/components/ChatApp.tsx**: 添加瀏覽器關閉事件監聽
  - 監聽 `beforeunload` 事件，在頁面關閉前嘗試調用 logout API
  - 使用 `navigator.sendBeacon` 或 `fetch` with `keepalive` 作為備用方案
  - 確保即使瀏覽器關閉也能標記用戶離線

## 2025-11-30 15:55:00

### 添加用戶離線狀態處理（登出和關閉瀏覽器）
- **backend/app/websocket.py**: 在 WebSocket 斷開時更新用戶離線狀態
  - 在 `handle_websocket` 的 `except WebSocketDisconnect` 中，更新用戶的 `is_online = False`
  - 廣播 `USER_LEFT` 事件通知其他用戶
  - 添加錯誤處理和日誌
- **frontend/services/api.ts**: 添加 `markUserOffline` 函數
  - 使用 `navigator.sendBeacon` 或 `fetch` with `keepalive` 確保在頁面關閉時也能發送請求
  - 導出 `markUserOffline` 供其他組件使用
- **frontend/components/ChatApp.tsx**: 添加瀏覽器關閉事件監聽
  - 監聽 `beforeunload` 事件，在頁面關閉前嘗試標記用戶離線
  - 監聽 `visibilitychange` 事件（可選，用於未來擴展）
  - 使用 `navigator.sendBeacon` 或 `fetch` with `keepalive` 作為備用方案

## 2025-11-30 15:50:00

### 修復 WebSocket 連接管理器和添加調試日誌
- **backend/app/websocket.py**: 修復 ConnectionManager 初始化問題
  - 添加缺失的 `self.active_connections: Dict[str, List[WebSocket]] = {}` 初始化
  - 在 `broadcast_room_created` 中添加調試日誌，顯示廣播的房間信息和連接數
  - 在 `broadcast` 方法中添加調試日誌，顯示廣播的目標用戶數和連接數
  - 在 `connect` 方法中添加調試日誌，顯示新連接的用戶信息
  - 在 `handle_websocket` 中添加連接和斷開的日誌
- **frontend/services/api.ts**: 添加 WebSocket 消息接收日誌
  - 在 `ws.onmessage` 中添加日誌，顯示接收到的 WebSocket 事件類型
- **frontend/components/ChatApp.tsx**: 添加 WebSocket 事件處理日誌
  - 在 WebSocket 事件處理器中添加日誌，顯示接收到的事件類型

## 2025-11-30 15:45:00

### 修復聊天室創建後不自動顯示的問題
- **frontend/components/ChatApp.tsx**: 改進房間創建和 WebSocket 事件處理
  - 在 `createRoom` 函數中，創建成功後立即手動添加到房間列表（不依賴 WebSocket 事件）
  - 改進 `ROOM_CREATED` 事件處理，如果房間已存在則更新而不是跳過
  - 在初始數據加載時，確保所有房間數據格式正確轉換（isPrivate/is_private）
  - 添加更詳細的錯誤日誌

## 2025-11-30 14:35:00

### 添加 Room 更新功能和 WebSocket 事件
- **backend/app/schemas.py**: 添加 RoomUpdateRequest
  - 支持更新房間名稱、描述和密碼
- **backend/app/routers/rooms.py**: 添加更新房間 API 端點
  - `PUT /api/rooms/{room_id}` - 更新房間信息（僅創建者可更新）
  - 添加異步 WebSocket 廣播，避免阻塞 API 響應
  - 優化 `create_room` 和 `delete_room` 的 WebSocket 廣播為異步執行
- **backend/app/websocket.py**: 添加 ROOM_UPDATED 事件
  - 新增 `broadcast_room_updated` 方法
  - 將方法綁定到 ConnectionManager 類
- **frontend/services/api.ts**: 添加 updateRoom 方法
  - 支持更新房間名稱、描述和密碼
- **frontend/components/ChatApp.tsx**: 改進 WebSocket 事件處理
  - 添加 `ROOM_UPDATED` 事件處理，更新現有房間信息
  - 改進 `ROOM_CREATED` 事件處理，避免重複添加房間
  - 確保數據格式正確轉換（isPrivate/is_private）

## 2025-11-30 14:30:00

### 強制應用深色主題到登入畫面
- **frontend/index.css**: 修復深色主題應用
  - 將 `:root` 和 `html` 都設為深色主題默認值
  - 添加 `body` 樣式直接設置背景色和文字顏色
  - 確保深色主題變量優先級最高
- **frontend/index.html**: 添加內聯樣式確保背景色
  - 在 `body` 標籤添加 `style` 屬性直接設置背景色
- **frontend/App.tsx**: 添加內聯樣式確保登入容器背景色
  - 在外層容器和卡片容器添加 `style` 屬性
  - 確保深色主題正確應用，即使 Tailwind 類沒有生效

## 2025-11-30 14:25:00

### 修復登入畫面背景顏色問題
- **frontend/index.css**: 修復深色主題背景顏色
  - 將深色主題設為默認（在 `html` 標籤上）
  - 確保 `html.dark` 明確指定深色主題變量
  - 添加 `html.light` 用於亮色主題
  - 解決背景顯示為白色的問題，確保默認顯示深色主題

## 2025-11-30 14:15:00

### 更新登入畫面以適應生產環境
- **frontend/index.html**: 更新頁面標題
  - 將 `WebP Chat Connect` 改為 `Chat - AI Tracks`
- **frontend/App.tsx**: 添加開發環境標識
  - 在登入畫面底部顯示 "Development Mode"（僅在開發環境）
  - 使用 `import.meta.env.MODE` 檢測環境
- **frontend/vite-env.d.ts**: 添加 MODE 類型定義
  - 添加 `MODE: string` 到 `ImportMetaEnv` 接口

## 2025-11-30 14:00:00

### 優化 WebSocket 配置和故障排除
- **deployment/nginx.conf**: 優化 WebSocket 代理配置
  - 調整超時設置為 7 天（WebSocket 長連接需要）
  - 添加 `proxy_cache off` 禁用緩存
  - 確保所有必需的 WebSocket 頭部正確設置
  - 優化緩衝區配置
- **deployment/websocket-troubleshooting.md**: 創建 WebSocket 故障排除指南
  - 詳細的檢查清單
  - 常見問題和解決方案
  - 調試步驟和驗證方法
  - 快速修復命令

## 2025-11-30 12:15:00

### 創建 index.css 文件
- **frontend/index.css**: 創建獨立的 CSS 文件
  - 將 `index.html` 中的內聯樣式移到獨立的 CSS 文件
  - 包含 CSS 變量定義（亮色/暗色主題）
  - 包含自定義滾動條樣式
- **frontend/index.html**: 移除內聯樣式
  - 移除 `<style>` 標籤中的樣式定義
  - 保留對 `index.css` 的引用

## 2025-11-30 12:10:00

### 將前端 API 配置改為使用環境變量
- **frontend/services/api.ts**: 使用環境變量配置 API URL
  - 從 `import.meta.env.VITE_API_BASE_URL` 讀取 API 基礎 URL
  - 從 `import.meta.env.VITE_WS_BASE_URL` 讀取 WebSocket URL
  - 提供默認值以支持開發環境
- **frontend/.env**: 創建開發環境配置文件
  - `VITE_API_BASE_URL=http://localhost:8000/api`
  - `VITE_WS_BASE_URL=ws://localhost:8000`
- **frontend/.env.production**: 創建生產環境配置文件
  - `VITE_API_BASE_URL=https://chat.ai-tracks.com/api`
  - `VITE_WS_BASE_URL=wss://chat.ai-tracks.com`
- **frontend/.gitignore**: 添加 .env 文件到忽略列表
  - 防止敏感配置被提交到版本控制
- **backend/main.py**: 更新 CORS 配置
  - 添加 `https://chat.ai-tracks.com` 和 `http://chat.ai-tracks.com` 到允許的來源列表
- **deployment/frontend-deploy.md**: 更新環境變量配置說明
  - 說明開發和生產環境的配置方式
  - 添加服務器上配置環境變量的步驟

## 2025-11-30 11:50:00

### 添加前端部署配置（使用 pnpm）
- **deployment/frontend-deploy.md**: 創建前端部署指南
  - 使用 pnpm 構建和部署前端應用
  - 包含 pnpm 安裝說明
  - 構建步驟和驗證方法
  - 環境變量配置說明
  - 故障排除指南
- **deployment/deploy-frontend.sh**: 創建自動化部署腳本
  - 自動檢查 pnpm 是否安裝
  - 安裝依賴和構建生產版本
  - 驗證構建結果
  - 顯示構建文件信息
- **deployment/README.md**: 更新部署指南
  - 添加前端部署快速步驟
  - 引用前端部署文檔

## 2025-11-30 00:10:00

### 添加生產環境部署配置
- **deployment/uvicorn-gunicorn.service**: 創建 systemd service 文件
  - 配置 Gunicorn + Uvicorn workers 用於生產環境
  - Service 名稱：`chat-ai-tracks-uvicorn-gunicorn.service`
  - Description：`chat-ai-tracks: Gunicorn with Uvicorn workers to serve chat-react backend (FastAPI)`
  - 工作目錄：`/home/ai-tracks-chat/htdocs/chat.ai-tracks.com/backend`
  - 用戶：`ai-tracks-chat`
  - 監聽端口：`127.0.0.1:8097`
  - 8 個 worker 進程，支持高並發
  - 配置日誌文件：`/var/log/uvicorn/chat-ai-tracks-access.log` 和 `chat-ai-tracks-error.log`
- **deployment/nginx.conf**: 創建完整的 Nginx 配置文件
  - 支持 HTTPS 和 HTTP/2
  - `/api/` 路由代理到後端（端口 8097）
  - `/ws` WebSocket 端點代理
  - `/docs`, `/redoc`, `/openapi.json` FastAPI 文檔端點
  - 前端靜態文件服務（React SPA）
  - 靜態資源緩存優化
  - 完整的代理頭部設置和超時配置
- **deployment/README.md**: 創建部署指南
  - 包含完整的安裝步驟
  - 提供常用 systemd 命令
  - Nginx 配置安裝說明
  - WebSocket 支持配置說明
- **backend/pyproject.toml**: 添加 gunicorn 依賴
  - 添加 `gunicorn==23.0.0` 到依賴列表

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

