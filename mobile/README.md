# Chat App - React Native (Expo)

移動端聊天應用，使用 React Native 和 Expo 構建。

## 功能

- 用戶認證（登入/註冊，帶 CAPTCHA 驗證）
- 多房間聊天
- 實時消息推送（WebSocket）
- 用戶管理（收藏、封鎖）
- 個人資料管理
- 圖片上傳

## 技術棧

- **框架**: Expo ~54.0
- **路由**: Expo Router ~4.0
- **狀態管理**: Zustand
- **存儲**: AsyncStorage
- **圖片處理**: expo-image-picker, expo-file-system
- **圖標**: @expo/vector-icons

## 安裝

```bash
cd mobile
npm install
```

## 配置

複製 `.env.example` 到 `.env` 並設置 API 地址：

```bash
cp .env.example .env
```

編輯 `.env` 文件：
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api
EXPO_PUBLIC_WS_BASE_URL=ws://localhost:8000
```

## 運行

```bash
# 啟動開發服務器
npm start

# 在 Android 上運行
npm run android

# 在 iOS 上運行（需要 macOS）
npm run ios

# 在 Web 上運行
npm run web
```

## 項目結構

```
mobile/
├── app/              # Expo Router 路由
│   ├── (auth)/      # 認證屏幕
│   └── (tabs)/      # 主應用標籤
├── components/       # 可重用組件
├── services/         # API 和 WebSocket 服務
├── store/           # Zustand 狀態管理
├── types/           # TypeScript 類型定義
└── constants/       # 常量配置
```

## 開發說明

- 使用 Expo Go 應用進行快速開發和測試
- 所有 API 調用都通過 `services/api.ts` 進行
- WebSocket 連接管理在 `services/websocket.ts` 中
- 全局狀態使用 Zustand stores 管理

