## Flutter `app` Overview

This Flutter project is a cross‑platform client (Android / iOS / Web) for the existing chat backend, mirroring the React frontend features with a clean architecture.

### Architecture

- **State management**: `provider`
- **HTTP client**: `dio`
- **WebSocket**: `web_socket_channel`
- **Storage**: `shared_preferences`
- **Env config**: `flutter_dotenv`
- **Image picking & display**: `image_picker`, `cached_network_image`

Folder structure:

- `lib/core/` – shared models and config (`models.dart`, `config.dart`)
- `lib/data/` – API client, repositories, realtime client
- `lib/presentation/` – UI screens (`login`, `chat`, `profile`)
- `lib/main.dart` – app bootstrap, `AuthState`, routing between login/chat

### Backend Integration

Env variables (from `.env`):

- `API_BASE_URL` – e.g. `https://chat.ai-tracks.com/api`
- `WS_BASE_URL` – e.g. `wss://chat.ai-tracks.com`

APIs used match the existing FastAPI backend (`/auth/login`, `/auth/register`, `/auth/me`, `/users/{id}/profile`, `/rooms`, `/messages`, `/upload/avatar`, `/upload/message-image`, `/ws`).

### Features (English / 繁體中文)

- Login / Register with math CAPTCHA（與 React 前端邏輯一致）
- Token 持久化與開機自動登入（透過 `/auth/me` 檢查）
- 房間列表、選擇房間、載入歷史訊息
- 發送文字訊息（含樂觀更新：先顯示 Temp 訊息，成功後以真正訊息取代）
- WebSocket 實時接收 `NEW_MESSAGE`、Room 變更事件
- Profile 管理：
  - 修改顯示名稱
  - 上傳頭像（透過 `/upload/avatar`，後端自動轉 WebP，資料庫只存 URL）

### How to Run /  執行方式

```bash
cd app
flutter pub get

# Web
flutter run -d chrome

# Android (需要裝置或模擬器)
flutter run -d android

# iOS (在 macOS + Xcode 環境)
flutter run -d ios
```

請先確認後端 `API_BASE_URL` / `WS_BASE_URL` 可正常連線，並與現有 React 前端使用的設定一致。

# app

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
