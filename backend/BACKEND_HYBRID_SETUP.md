# 後端混合方案配置指南

## 概述

後端需要配合前端混合實時連接方案，提供以下支持：
1. **WebSocket 端點**（已實現）
2. **Long Polling 備用端點**（已實現）
3. **心跳檢測支持**（需要添加）

## 已實現的功能

### ✅ 1. WebSocket 端點
- **路徑**: `/ws`
- **認證**: 通過 query 參數 `token` 進行 JWT 認證
- **功能**: 雙向實時通信
- **位置**: `backend/app/websocket.py`

### ✅ 2. Long Polling 端點
- **路徑**: `/api/realtime/poll`
- **認證**: 通過 HTTP Header `Authorization: Bearer {token}`
- **功能**: 當 WebSocket 不可用時的備用方案
- **位置**: `backend/app/routers/realtime.py`

### ✅ 3. 路由註冊
- 已在 `backend/main.py` 中註冊 realtime 路由

## 需要添加的功能

### 🔧 1. WebSocket 心跳檢測支持

前端會發送 `ping` 消息，後端需要回應 `pong`。

**已實現**：在 `backend/app/websocket.py` 的 `handle_websocket` 函數中已添加心跳處理。

```python
# 處理心跳消息（ping/pong）
try:
    message = json.loads(data)
    if message.get("type") == "ping":
        # 回應心跳
        await websocket.send_json({"type": "pong"})
        continue
except json.JSONDecodeError:
    # 如果不是 JSON，忽略
    pass
```

### 🔧 2. Long Polling 優化

**已優化**：`/api/realtime/poll` 端點已優化為：
- 支持增量獲取（通過 `lastMessageId` 和 `lastTimestamp`）
- 首次請求返回初始數據（房間列表、用戶列表）
- 後續請求只返回新事件
- 立即返回（不等待），客戶端會立即發起下一次請求

## 配置檢查清單

### 1. 確認路由已註冊

檢查 `backend/main.py`：
```python
from app.routers import auth, users, rooms, messages, realtime

app.include_router(realtime.router, prefix="/api/realtime", tags=["實時通信"])
```

### 2. 確認 WebSocket 心跳處理

檢查 `backend/app/websocket.py` 的 `handle_websocket` 函數是否處理 `ping` 消息。

### 3. 確認 Long Polling 端點

測試端點：
```bash
curl -H "Authorization: Bearer {token}" \
     "http://localhost:8000/api/realtime/poll"
```

應該返回：
```json
{
  "events": [...],
  "timestamp": "2025-11-30T16:00:00"
}
```

## 性能優化建議

### 1. Long Polling 數據庫查詢優化

當前實現每次請求都會查詢數據庫。可以考慮：

- **使用 Redis 緩存**：將最近的事件緩存在 Redis 中
- **使用消息隊列**：將事件推送到隊列，Long Polling 從隊列讀取
- **增量查詢優化**：使用 `lastTimestamp` 索引優化查詢

### 2. 連接數限制

Long Polling 會產生較多 HTTP 請求，建議：

- 設置合理的請求頻率限制
- 監控並發連接數
- 考慮使用連接池

### 3. 事件去重

確保 Long Polling 返回的事件不會重複：

- 使用 `lastMessageId` 和 `lastTimestamp` 精確控制
- 在數據庫查詢中使用 `>` 而不是 `>=`

## 測試

### 測試 WebSocket 心跳

```python
# 測試腳本
import asyncio
import websockets
import json

async def test_heartbeat():
    uri = "ws://localhost:8000/ws?token=YOUR_TOKEN"
    async with websockets.connect(uri) as websocket:
        # 發送 ping
        await websocket.send(json.dumps({"type": "ping"}))
        # 接收 pong
        response = await websocket.recv()
        print(f"Received: {response}")  # 應該收到 {"type": "pong"}

asyncio.run(test_heartbeat())
```

### 測試 Long Polling

```bash
# 首次請求（獲取初始數據）
curl -H "Authorization: Bearer {token}" \
     "http://localhost:8000/api/realtime/poll"

# 後續請求（只獲取新事件）
curl -H "Authorization: Bearer {token}" \
     "http://localhost:8000/api/realtime/poll?lastMessageId={id}&lastTimestamp={timestamp}"
```

## 監控和日誌

### 建議添加的日誌

1. **WebSocket 連接/斷開**
   ```python
   print(f"[WebSocket] User {user_id} connected")
   print(f"[WebSocket] User {user_id} disconnected")
   ```

2. **Long Polling 請求**
   ```python
   print(f"[LongPoll] User {current_user.id} polling, lastMessageId: {lastMessageId}")
   ```

3. **心跳檢測**
   ```python
   print(f"[WebSocket] Heartbeat from user {user.id}")
   ```

## 總結

後端已經基本配置完成，主要需要：

1. ✅ **WebSocket 心跳支持** - 已實現
2. ✅ **Long Polling 端點** - 已實現並優化
3. ✅ **路由註冊** - 已完成
4. ⚠️ **可選優化** - Redis 緩存、消息隊列等（根據需求）

當前實現已經可以支持混合方案，前端可以：
- 優先使用 WebSocket
- 自動降級到 Long Polling
- 無縫切換

