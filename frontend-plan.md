# Frontend 開發計劃書

## 項目概述

這是一個基於 React + TypeScript 的即時聊天應用前端系統，提供完整的用戶認證、房間管理、即時消息傳輸、用戶關係管理等功能。

**最後更新時間**: 2025-01-27

---

## 技術棧

- **框架**: React 19.2.0
- **語言**: TypeScript 5.8.2
- **構建工具**: Vite 6.2.0
- **UI 庫**: Tailwind CSS (CDN)
- **圖標**: Lucide React 0.555.0
- **狀態管理**: React Hooks (useState, useEffect)
- **數據持久化**: localStorage
- **圖片處理**: Canvas API (WebP 轉換)

---

## 核心功能模塊

### 1. 認證系統 (Authentication)

#### 1.1 登入功能 (Login)
**文件**: `frontend/App.tsx`

**功能詳述**:
- **表單欄位**:
  - Email 地址輸入框
  - 密碼輸入框
  - 驗證碼 (CAPTCHA) 輸入框
- **驗證碼機制**:
  - 動態生成數學運算題（加減乘除）
  - 確保結果為正整數
  - 提供刷新按鈕重新生成
  - 登入前必須驗證通過
- **驗證流程**:
  1. 用戶輸入 email 和密碼
  2. 完成驗證碼計算
  3. 提交表單
  4. 調用 `mockBackend.login()` 驗證憑證
  5. 成功後保存用戶信息到 localStorage
  6. 設置用戶在線狀態
  7. 跳轉到聊天主界面
- **錯誤處理**:
  - 顯示錯誤訊息（憑證錯誤、驗證碼錯誤）
  - 驗證碼錯誤時自動刷新
- **會話持久化**:
  - 使用 `localStorage.getItem('chat_current_user')` 檢查已保存的會話
  - 應用啟動時自動恢復登入狀態

#### 1.2 註冊功能 (Register)
**功能詳述**:
- **表單欄位**:
  - 顯示名稱 (Display Name)
  - Email 地址
  - 密碼
  - **注意**: 註冊時不需要驗證碼
- **驗證流程**:
  1. 檢查 email 是否已存在
  2. 創建新用戶（自動生成 ID、頭像）
  3. 設置用戶為在線狀態
  4. 保存到 localStorage
  5. 廣播 `USER_JOINED` 事件
  6. 自動登入並跳轉
- **頭像生成**:
  - 使用 DiceBear API 根據用戶名稱生成初始頭像
  - URL 格式: `https://api.dicebear.com/7.x/initials/svg?seed={name}`

#### 1.3 登出功能 (Logout)
**功能詳述**:
- 清除當前用戶狀態
- 設置用戶離線狀態
- 清除 localStorage 中的會話信息
- 重置表單狀態
- 返回登入頁面

---

### 2. Room 管理系統 (Room Management)

#### 2.1 Room 列表顯示
**文件**: `frontend/components/ChatApp.tsx`

**功能詳述**:
- **側邊欄位置**: 左側固定寬度 288px (w-72)
- **顯示內容**:
  - Room 名稱
  - Room 類型圖標（公開: `#`, 私有: `🔒`）
  - 當前活躍 Room 高亮顯示
- **交互功能**:
  - 點擊 Room 進入聊天
  - 懸停顯示刪除按鈕（僅創建者可見）
  - 響應式設計：移動端可收起/展開

#### 2.2 創建 Room
**功能詳述**:
- **觸發方式**: 點擊側邊欄頂部的 `+` 按鈕
- **表單欄位**:
  - Room 名稱（必填）
  - 是否為私有 Room（複選框）
  - 密碼（僅私有 Room 需要）
- **Room 類型**:
  - **公開 Room**: 所有用戶可見可加入
  - **私有 Room**: 需要密碼驗證才能加入
- **創建流程**:
  1. 填寫 Room 信息
  2. 提交表單
  3. 調用 `mockBackend.createRoom()`
  4. 廣播 `ROOM_CREATED` 事件
  5. 自動加入新創建的 Room
- **權限控制**:
  - 只有 Room 創建者可以刪除 Room
  - Room 創建者加入私有 Room 不需要密碼

#### 2.3 加入 Room
**功能詳述**:
- **公開 Room**:
  - 直接點擊即可加入
  - 自動載入該 Room 的歷史消息
- **私有 Room**:
  - 點擊後彈出密碼輸入模態框
  - 驗證密碼正確性
  - 密碼錯誤顯示錯誤訊息
  - 密碼正確後進入 Room
- **進入 Room 後**:
  - 設置 `activeRoomId`
  - 載入該 Room 的所有消息 (`mockBackend.getMessages()`)
  - 訂閱該 Room 的新消息事件
  - 移動端自動關閉側邊欄

#### 2.4 刪除 Room
**功能詳述**:
- **權限**: 僅 Room 創建者可見刪除按鈕
- **流程**:
  1. 懸停 Room 項目顯示刪除圖標
  2. 點擊刪除按鈕
  3. 確認對話框
  4. 調用 `mockBackend.deleteRoom()`
  5. 廣播 `ROOM_DELETED` 事件
  6. 如果當前在該 Room，自動退出
  7. 顯示提示訊息

---

### 3. 聊天功能 (Chat Features)

#### 3.1 消息顯示區域
**功能詳述**:
- **布局**: 居中區域，佔滿剩餘空間
- **消息渲染**:
  - 根據 `senderId` 判斷是否為當前用戶
  - 當前用戶消息靠右對齊，其他用戶靠左
  - 顯示發送者頭像、名稱、時間戳
  - 自動滾動到最新消息
- **消息類型**:
  - **文字消息**: 顯示在氣泡框中
  - **圖片消息**: 顯示縮略圖，標註 "WEBP Generated"
- **過濾機制**:
  - 自動過濾被當前用戶封鎖的用戶發送的消息
  - 被封鎖用戶的消息不會顯示

#### 3.2 發送消息
**功能詳述**:
- **文字消息**:
  - 輸入框位於聊天區域底部
  - 支持 Enter 提交
  - 空消息無法發送
  - 發送後清空輸入框
- **圖片消息**:
  - 點擊圖片圖標選擇文件
  - 自動轉換為 WebP 格式（`convertImageToWebP()`）
  - 圖片最大尺寸限制為 800px（寬或高）
  - 轉換為 base64 格式存儲
  - 發送後廣播 `NEW_MESSAGE` 事件
- **消息結構**:
```typescript
{
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string; // 文字或 base64 WebP
  type: 'text' | 'image';
  timestamp: number;
}
```

#### 3.3 即時消息更新
**功能詳述**:
- **WebSocket 模擬**: 使用 `subscribeToSocket()` 訂閱事件
- **事件類型**:
  - `NEW_MESSAGE`: 新消息到達
  - `ROOM_CREATED`: Room 創建
  - `ROOM_DELETED`: Room 刪除
  - `USER_UPDATE`: 用戶信息更新
  - `USER_JOINED`: 新用戶加入
  - `USER_LEFT`: 用戶離線
- **消息過濾**:
  - 只顯示當前活躍 Room 的消息
  - 使用 `activeRoomIdRef` 確保正確過濾

---

### 4. 用戶管理系統 (User Management)

#### 4.1 用戶列表顯示
**功能詳述**:
- **側邊欄位置**: 右側固定寬度 288px (w-72)
- **分組顯示**:
  - **我的收藏** (My Favorites): 標星用戶
  - **所有用戶** (All Users): 其他用戶
  - **我** (You): 當前用戶（置底顯示）
- **用戶信息顯示**:
  - 頭像（圓形，帶在線狀態指示器）
  - 顯示名稱
  - 掩碼後的 Email（格式: `username@*****`）
- **過濾機制**:
  - 自動過濾被當前用戶封鎖的用戶
  - 被封鎖的用戶不出現在列表中

#### 4.2 收藏用戶 (Favorites)
**功能詳述**:
- **添加收藏**:
  - 點擊用戶項目的星標圖標
  - 調用 `mockBackend.toggleFavorite()`
  - 用戶移動到 "我的收藏" 分組
- **移除收藏**:
  - 再次點擊星標圖標
  - 用戶移動回 "所有用戶" 分組
- **持久化**: 收藏列表保存在用戶數據中

#### 4.3 封鎖/解封用戶 (Block/Unblock)
**功能詳述**:
- **封鎖用戶**:
  - 點擊用戶項目的封鎖圖標（Ban icon）
  - 確認對話框
  - 調用 `mockBackend.blockUser()`
  - 自動從收藏列表中移除（如果存在）
  - 用戶從列表中消失
  - 該用戶的消息不再顯示
- **解封用戶**:
  - 在設置頁面的 "Block Members" 區塊中操作
  - 顯示所有被封鎖的用戶列表
  - 點擊 "Unblock" 按鈕
  - 調用 `mockBackend.unblockUser()`
  - 用戶重新出現在列表中（但不會自動加回收藏）

---

### 5. 設置功能 (Settings)

#### 5.1 設置模態框
**文件**: `frontend/components/ChatApp.tsx` - `SettingsModal`

**功能詳述**:
- **觸發方式**: 點擊左下角當前用戶信息區域
- **手風琴式布局** (Accordion):
  - 可展開/收起的區塊
  - 同時只能展開一個區塊
  - 區塊標題顯示圖標和名稱

#### 5.2 個人資料編輯 (My Profile)
**功能詳述**:
- **可編輯欄位**:
  - **頭像**: 
    - 點擊頭像上傳新圖片
    - 自動轉換為 WebP 格式
    - 實時預覽
  - **顯示名稱**: 文字輸入框
  - **Email**: 只讀顯示
  - **新密碼**: 可選，留空則不修改
- **保存流程**:
  1. 填寫更新信息
  2. 點擊 "Save Changes"
  3. 調用 `mockBackend.updateProfile()`
  4. 廣播 `USER_UPDATE` 事件
  5. 更新當前用戶狀態
  6. 顯示成功提示

#### 5.3 封鎖成員管理 (Block Members)
**功能詳述**:
- **顯示內容**:
  - 顯示被封鎖用戶的數量（標題中）
  - 列表顯示所有被封鎖的用戶
  - 每個用戶顯示頭像、名稱（帶刪除線效果）
- **操作**:
  - 點擊 "Unblock" 按鈕解封用戶
  - 解封後用戶重新出現在成員列表中

#### 5.4 反饋與支持 (Feedback & Support)
**功能詳述**:
- **表單欄位**:
  - **反饋類型** (下拉選單):
    - General Feedback / Usage（一般反饋/使用問題）
    - Bug Report（錯誤報告）
    - User Report（用戶舉報）
  - **詳細內容** (多行文本輸入框)
- **提交流程**:
  1. 選擇反饋類型
  2. 填寫詳細內容
  3. 點擊 "Create Email"
  4. 使用 `mailto:` 協議打開郵件客戶端
  5. 自動填充收件人、主題、正文
  6. 收件人: `renfu.her@gmail.com`

---

### 6. 搜索功能 (Search)

#### 6.1 搜索模態框
**文件**: `frontend/components/ChatApp.tsx` - `SearchModal`

**功能詳述**:
- **觸發方式**: 點擊 Room 列表頂部的搜索圖標
- **雙標籤頁**:
  - **Users 標籤**: 搜索用戶
  - **Chat History 標籤**: 搜索消息歷史

#### 6.2 用戶搜索
**功能詳述**:
- **搜索範圍**:
  - 用戶名稱（不區分大小寫）
  - Email 地址（不區分大小寫）
- **過濾條件**:
  - 排除當前用戶
  - 排除被封鎖的用戶
- **結果顯示**:
  - 用戶頭像
  - 用戶名稱
  - 掩碼後的 Email
  - 快速添加到收藏按鈕
- **實時搜索**: 輸入即時過濾（客戶端）

#### 6.3 消息歷史搜索
**功能詳述**:
- **搜索條件**:
  - 至少輸入 3 個字符才開始搜索
  - 搜索消息內容（僅文字消息）
  - 不區分大小寫
- **防抖處理**: 500ms 延遲，避免頻繁請求
- **結果顯示**:
  - Room 名稱（標籤）
  - 發送者頭像和名稱
  - 消息內容預覽（最多 2 行）
  - 發送日期
- **交互**:
  - 點擊結果項目自動跳轉到對應 Room
  - 關閉搜索模態框
- **後端調用**: `mockBackend.searchGlobalMessages(query)`

---

### 7. UI/UX 設計

#### 7.1 主題系統 (Theme System)
**功能詳述**:
- **主題類型**:
  - 深色模式 (Dark Mode) - 默認
  - 淺色模式 (Light Mode)
- **切換方式**: 點擊左下角主題切換按鈕（太陽/月亮圖標）
- **持久化**: 主題選擇保存在 `localStorage.getItem('chat_theme')`
- **CSS 變量系統**:
  - 使用 CSS 自定義屬性定義顏色
  - 通過 `html.dark` 類切換主題
  - 所有顏色通過語義化變量引用

#### 7.2 響應式設計
**功能詳述**:
- **桌面端** (≥768px):
  - 三欄布局：Room 列表 | 聊天區域 | 用戶列表
  - 側邊欄固定顯示
- **移動端** (<768px):
  - 單欄布局，顯示聊天區域
  - 頂部固定導航欄
  - 側邊欄可通過按鈕展開/收起
  - 點擊遮罩層關閉側邊欄
  - 進入 Room 後自動關閉側邊欄

#### 7.3 視覺設計
**功能詳述**:
- **顏色系統**:
  - Primary: `#3b82f6` (藍色)
  - 語義化顏色變量（darker, dark, paper, txt-main, txt-muted 等）
- **圖標系統**: Lucide React 圖標庫
- **動畫效果**:
  - 側邊欄滑入/滑出動畫
  - 按鈕點擊縮放效果
  - 消息發送過渡動畫
- **自定義滾動條**: 細窄樣式，符合設計風格

---

### 8. 數據流與狀態管理

#### 8.1 狀態結構
**主要狀態**:
```typescript
// App.tsx
- user: User | null
- view: 'LOGIN' | 'REGISTER'
- email, password, name
- captcha, captchaInput
- loading, error

// ChatApp.tsx
- rooms: Room[]
- users: User[]
- activeRoomId: string | null
- messages: Message[]
- inputMessage: string
- showCreateRoom, showSettings, showSearch
- sidebarOpen, userListOpen
- theme: 'light' | 'dark'
```

#### 8.2 數據持久化
**localStorage Keys**:
- `chat_current_user`: 當前登入用戶信息
- `chat_users`: 所有用戶數據
- `chat_rooms`: 所有 Room 數據
- `chat_messages`: 所有消息數據
- `chat_theme`: 主題設置

#### 8.3 事件系統
**WebSocket 模擬事件**:
- `NEW_MESSAGE`: 新消息
- `ROOM_CREATED`: Room 創建
- `ROOM_DELETED`: Room 刪除
- `USER_UPDATE`: 用戶更新
- `USER_JOINED`: 用戶加入
- `USER_LEFT`: 用戶離線

---

### 9. 文件結構

```
frontend/
├── App.tsx                 # 主應用組件（認證頁面）
├── components/
│   └── ChatApp.tsx        # 聊天應用主組件
├── services/
│   ├── mockBackend.ts     # 模擬後端 API
│   └── imageUtils.ts      # 圖片處理工具（WebP 轉換）
├── types.ts               # TypeScript 類型定義
├── index.tsx              # 應用入口
├── index.html            # HTML 模板
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
└── package.json          # 依賴管理
```

---

### 10. 核心類型定義

```typescript
// User
interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  isOnline: boolean;
  bio?: string;
  favorites: string[];  // 收藏的用戶 ID 列表
  blocked: string[];    // 封鎖的用戶 ID 列表
}

// Room
interface Room {
  id: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  createdBy: string;     // 創建者用戶 ID
  description?: string;
}

// Message
interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;       // 文字或 base64 WebP
  type: 'text' | 'image';
  timestamp: number;
}
```

---

### 11. 關鍵功能流程圖

#### 11.1 登入流程
```
用戶輸入 Email/密碼 → 完成驗證碼 → 提交表單 
→ mockBackend.login() → 驗證憑證 
→ 設置在線狀態 → 保存到 localStorage 
→ 跳轉到 ChatApp
```

#### 11.2 發送消息流程
```
用戶輸入消息 → 點擊發送/按 Enter 
→ mockBackend.sendMessage() 
→ 保存到 localStorage 
→ 廣播 NEW_MESSAGE 事件 
→ 所有訂閱者更新消息列表
```

#### 11.3 加入私有 Room 流程
```
點擊私有 Room → 檢查是否為創建者 
→ 是創建者：直接進入 
→ 不是創建者：彈出密碼輸入框 
→ 驗證密碼 → 正確則進入，錯誤則提示
```

---

### 12. 安全與驗證

#### 12.1 前端驗證
- **登入驗證碼**: 防止自動化攻擊
- **表單驗證**: 必填欄位檢查
- **Email 格式驗證**: HTML5 email input
- **密碼驗證**: 私有 Room 密碼驗證

#### 12.2 數據過濾
- **消息過濾**: 自動過濾被封鎖用戶的消息
- **用戶列表過濾**: 不顯示被封鎖的用戶
- **Email 掩碼**: 保護用戶隱私

---

### 13. 性能優化

#### 13.1 圖片處理
- **WebP 轉換**: 所有上傳圖片自動轉換為 WebP 格式
- **尺寸限制**: 最大 800px（寬或高），減少存儲空間
- **Base64 存儲**: 直接嵌入消息，無需額外請求

#### 13.2 渲染優化
- **條件渲染**: 只渲染當前 Room 的消息
- **Ref 使用**: `activeRoomIdRef` 避免閉包問題
- **防抖搜索**: 消息搜索 500ms 防抖

---

### 14. 待改進項目

1. **真實後端集成**: 目前使用 mockBackend，需要替換為真實 API
2. **WebSocket 連接**: 目前是模擬，需要真實 WebSocket 連接
3. **錯誤處理**: 增強錯誤處理和用戶提示
4. **加載狀態**: 添加更多加載指示器
5. **消息分頁**: 大量消息時實現分頁加載
6. **圖片預覽**: 點擊圖片可放大查看
7. **消息編輯/刪除**: 支持編輯和刪除自己發送的消息
8. **在線狀態**: 更精確的在線/離線狀態管理
9. **通知系統**: 新消息通知（瀏覽器通知）
10. **多語言支持**: i18n 國際化

---

## 總結

本前端系統提供了一個完整的即時聊天應用解決方案，包含：

- ✅ 用戶認證（登入/註冊/登出）
- ✅ Room 管理（創建/加入/刪除）
- ✅ 即時消息（文字/圖片）
- ✅ 用戶關係管理（收藏/封鎖）
- ✅ 搜索功能（用戶/消息歷史）
- ✅ 設置功能（個人資料/封鎖管理/反饋）
- ✅ 主題切換（深色/淺色）
- ✅ 響應式設計（桌面/移動端）

系統採用 React Hooks 進行狀態管理，使用 localStorage 進行數據持久化，通過事件系統模擬 WebSocket 實時通信。所有功能均已實現並可正常運行。

