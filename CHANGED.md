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

