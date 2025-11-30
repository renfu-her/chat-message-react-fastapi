# 混合實時連接方案使用指南

## 概述

混合實時連接方案結合了 WebSocket 和 Long Polling 的優點：
- **主要使用 WebSocket**：提供最佳性能和雙向通信
- **自動降級到 Long Polling**：當 WebSocket 不可用時自動切換
- **統一接口**：上層代碼無需關心底層實現

## 架構

```
前端應用
  ↓
RealtimeConnectionManager (統一接口)
  ↓
┌─────────────┬──────────────┐
│  WebSocket  │ Long Polling │
│  (優先)     │  (備用)      │
└─────────────┴──────────────┘
```

## 使用方式

### 1. 基本使用（推薦）

```typescript
import { api } from './services/api';

// 訂閱實時事件
const unsubscribe = api.subscribeToRealtime((event) => {
  switch (event.type) {
    case 'NEW_MESSAGE':
      // 處理新消息
      break;
    case 'ROOM_CREATED':
      // 處理房間創建
      break;
    case 'USER_UPDATE':
      // 處理用戶更新
      break;
  }
});

// 取消訂閱
unsubscribe();
```

### 2. 檢查連接狀態

```typescript
const status = await api.getRealtimeStatus();
console.log('Connection type:', status.type); // 'websocket' | 'longpolling' | 'disconnected'
console.log('Connection status:', status.status); // 'connected' | 'connecting' | 'disconnected' | 'error'
```

### 3. 在 ChatApp 中使用

```typescript
// 在 ChatApp.tsx 中
useEffect(() => {
  const token = localStorage.getItem('chat_token');
  if (!token) return;

  // 使用混合連接方案
  const unsubscribe = api.subscribeToRealtime((event) => {
    const currentRoomId = activeRoomIdRef.current;
    
    switch (event.type) {
      case 'NEW_MESSAGE':
        // 處理邏輯...
        break;
      case 'ROOM_CREATED':
        // 處理邏輯...
        break;
      // ... 其他事件
    }
  });

  return () => {
    unsubscribe();
  };
}, [currentUser.id]);
```

## 工作原理

### 連接流程

1. **嘗試 WebSocket**
   - 首先嘗試建立 WebSocket 連接
   - 如果成功，使用 WebSocket 進行通信

2. **自動降級**
   - 如果 WebSocket 連接失敗或斷開
   - 自動切換到 Long Polling
   - 前端定期發送 HTTP 請求獲取新事件

3. **自動重連**
   - WebSocket 斷開時，會嘗試重新連接
   - 達到最大重連次數後，切換到 Long Polling

### 事件處理

無論使用哪種連接方式，事件格式都保持一致：

```typescript
interface RealtimeEvent {
  type: string;      // 事件類型
  payload: any;      // 事件數據
}
```

## 配置

### 環境變量

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000
```

### 連接參數

可以在 `realtimeConnection.ts` 中調整：

```typescript
private maxReconnectAttempts = 5;  // 最大重連次數
// 心跳間隔：30秒
// Long Polling 間隔：100ms（有新事件時）
// Long Polling 重試間隔：2秒（錯誤時）
```

## 優勢

### 1. 高可靠性
- WebSocket 失敗時自動降級
- 適用於各種網絡環境

### 2. 最佳性能
- WebSocket 可用時提供最佳性能
- Long Polling 作為可靠備用

### 3. 統一接口
- 上層代碼無需關心底層實現
- 切換對用戶透明

### 4. 自動恢復
- 網絡恢復後自動嘗試切換回 WebSocket

## 後端實現

### Long Polling 端點

```python
GET /api/realtime/poll?lastMessageId={id}
```

返回格式：
```json
{
  "events": [
    {
      "type": "NEW_MESSAGE",
      "payload": { ... }
    }
  ],
  "timestamp": "2025-11-30T16:00:00"
}
```

## 監控和調試

### 查看連接狀態

```typescript
// 在瀏覽器控制台
const status = await api.getRealtimeStatus();
console.log(status);
```

### 日誌

連接管理器會輸出詳細日誌：
- `[Realtime] WebSocket connected`
- `[Realtime] Falling back to Long Polling`
- `[Realtime] Attempting to reconnect...`

## 遷移指南

### 從純 WebSocket 遷移

1. **替換訂閱方法**
   ```typescript
   // 舊版
   const unsubscribe = api.subscribeToSocket(callback);
   
   // 新版（推薦）
   const unsubscribe = api.subscribeToRealtime(callback);
   ```

2. **事件格式保持一致**
   - 事件格式完全相同，無需修改處理邏輯

3. **可選：添加狀態監控**
   ```typescript
   const status = await api.getRealtimeStatus();
   if (status.type === 'longpolling') {
     console.warn('Using fallback connection');
   }
   ```

## 注意事項

1. **Long Polling 限制**
   - 只支持服務器到客戶端的推送
   - 客戶端發送消息仍需使用 HTTP API

2. **性能考慮**
   - Long Polling 會產生更多 HTTP 請求
   - 應該優先使用 WebSocket

3. **服務器負載**
   - Long Polling 會增加服務器負載
   - 建議設置合理的超時和間隔

## 未來優化

- [ ] 添加連接質量檢測
- [ ] 實現智能切換（根據網絡狀況）
- [ ] 添加消息隊列和確認機制
- [ ] 支持多個連接（負載均衡）

