# WebSocket 事件文檔

本文檔列出所有已實現的 WebSocket 事件及其觸發時機。

## 聊天室（Room）事件

### ROOM_CREATED
**觸發時機**: 當用戶創建新房間時
**後端位置**: `backend/app/routers/rooms.py` - `create_room()`
**前端處理**: `frontend/components/ChatApp.tsx` - WebSocket 事件監聽器
**事件格式**:
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

### ROOM_UPDATED
**觸發時機**: 當房間信息被更新時（名稱、描述、密碼）
**後端位置**: `backend/app/routers/rooms.py` - `update_room()`
**前端處理**: `frontend/components/ChatApp.tsx` - WebSocket 事件監聽器
**事件格式**:
```json
{
  "type": "ROOM_UPDATED",
  "payload": {
    "id": "room_id",
    "name": "Updated Room Name",
    "isPrivate": false,
    "createdBy": "user_id",
    "description": "Updated description"
  }
}
```

### ROOM_DELETED
**觸發時機**: 當房間被刪除時
**後端位置**: `backend/app/routers/rooms.py` - `delete_room()`
**前端處理**: `frontend/components/ChatApp.tsx` - WebSocket 事件監聽器
**事件格式**:
```json
{
  "type": "ROOM_DELETED",
  "payload": {
    "roomId": "room_id"
  }
}
```

## 用戶狀態（User）事件

### USER_UPDATE
**觸發時機**: 
- 用戶更新個人資料時
- 用戶切換收藏/取消收藏時
- 用戶封鎖/解封其他用戶時
- 用戶登入時（狀態從離線變為在線）
**後端位置**: 
- `backend/app/routers/users.py` - `update_profile()`, `toggle_favorite()`, `block_user()`, `unblock_user()`
- `backend/app/routers/auth.py` - `login()`
**前端處理**: `frontend/components/ChatApp.tsx` - WebSocket 事件監聽器
**事件格式**:
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
**觸發時機**: 當新用戶註冊時
**後端位置**: `backend/app/routers/auth.py` - `register()`
**前端處理**: `frontend/components/ChatApp.tsx` - WebSocket 事件監聽器
**事件格式**:
```json
{
  "type": "USER_JOINED",
  "payload": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "avatar": "avatar_url",
    "isOnline": true,
    "bio": "User bio",
    "favorites": [],
    "blocked": []
  }
}
```

### USER_LEFT
**觸發時機**: 
- 用戶主動登出時
- WebSocket 連接斷開時（關閉瀏覽器、網絡中斷等）
**後端位置**: 
- `backend/app/routers/auth.py` - `logout()`
- `backend/app/websocket.py` - `handle_websocket()` (WebSocketDisconnect)
**前端處理**: `frontend/components/ChatApp.tsx` - WebSocket 事件監聽器
**事件格式**:
```json
{
  "type": "USER_LEFT",
  "payload": {
    "userId": "user_id"
  }
}
```

## 消息（Message）事件

### NEW_MESSAGE
**觸發時機**: 當用戶發送新消息時
**後端位置**: `backend/app/routers/messages.py` - `send_message()`
**前端處理**: `frontend/components/ChatApp.tsx` - WebSocket 事件監聽器
**事件格式**:
```json
{
  "type": "NEW_MESSAGE",
  "payload": {
    "id": "message_id",
    "roomId": "room_id",
    "senderId": "user_id",
    "senderName": "User Name",
    "senderAvatar": "avatar_url",
    "content": "Message content",
    "type": "text",
    "timestamp": "2025-11-30T16:00:00"
  }
}
```

## WebSocket 連接狀態

### 連接建立
- 用戶登入或註冊成功後自動建立 WebSocket 連接
- 連接 URL: `ws://localhost:8000/ws?token={jwt_token}`

### 連接斷開
- 用戶登出時主動斷開
- 瀏覽器關閉時自動斷開
- 網絡中斷時自動斷開
- 斷開時自動更新用戶離線狀態並廣播 `USER_LEFT` 事件

## 檢查清單

- [x] ROOM_CREATED - 已實現並連接
- [x] ROOM_UPDATED - 已實現並連接
- [x] ROOM_DELETED - 已實現並連接
- [x] USER_UPDATE - 已實現並連接（包括登入時）
- [x] USER_JOINED - 已實現並連接
- [x] USER_LEFT - 已實現並連接（包括登出和 WebSocket 斷開）
- [x] NEW_MESSAGE - 已實現並連接

