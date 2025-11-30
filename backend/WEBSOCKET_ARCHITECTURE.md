# WebSocket 架構說明

## 當前實現：全域廣播

### 連接管理結構

```python
# 連接存儲結構
active_connections: Dict[str, List[WebSocket]] = {
    "user_id_1": [websocket1, websocket2],  # 一個用戶可以有多個連接（多設備）
    "user_id_2": [websocket3],
    "user_id_3": [websocket4, websocket5, websocket6],
}
```

### 廣播方式

#### 1. 全域廣播（當前實現）

```python
async def broadcast(self, message: dict):
    """廣播消息給所有連接的用戶"""
    for user_id, connections in self.active_connections.items():
        for connection in connections:
            await connection.send_json(message)
```

**特點**：
- ✅ 簡單實現
- ✅ 所有用戶都能收到所有事件
- ❌ 效率較低（發送給不需要的用戶）
- ❌ 前端需要過濾（根據 `roomId` 等）

**當前使用場景**：
- `NEW_MESSAGE` - 發送給所有人，前端根據 `roomId` 過濾
- `ROOM_CREATED` - 發送給所有人
- `USER_UPDATE` - 發送給所有人
- `USER_JOINED` - 發送給所有人
- `USER_LEFT` - 發送給所有人

#### 2. 按房間廣播（當前未實現）

```python
async def broadcast_to_room(self, message: dict, room_id: str):
    """廣播消息給特定房間的所有用戶"""
    # 當前實現：簡化處理，廣播給所有人
    await self.broadcast(message)
```

**問題**：目前 `broadcast_to_room` 實際上還是全域廣播，前端負責過濾。

---

## 優化方案：按房間分組

### 方案 1：房間成員追蹤（推薦）

#### 實現思路

1. **追蹤用戶所在的房間**
   ```python
   # 連接時記錄用戶進入的房間
   user_rooms: Dict[str, Set[str]] = {
       "user_id_1": {"room_id_1", "room_id_2"},
       "user_id_2": {"room_id_1"},
   }
   ```

2. **按房間廣播**
   ```python
   async def broadcast_to_room(self, message: dict, room_id: str):
       """只發送給在該房間的用戶"""
       for user_id, rooms in self.user_rooms.items():
           if room_id in rooms:
               # 發送給該用戶的所有連接
               for connection in self.active_connections.get(user_id, []):
                   await connection.send_json(message)
   ```

#### 優點
- ✅ 只發送給相關用戶，效率高
- ✅ 減少網絡流量
- ✅ 前端無需過濾

#### 缺點
- ❌ 需要追蹤用戶進入/離開房間
- ❌ 實現較複雜

### 方案 2：混合方案（平衡）

- **全域事件**（房間創建、用戶更新等）：全域廣播
- **房間事件**（消息）：按房間廣播

---

## 實現建議

### 選項 A：保持當前全域廣播（簡單）

**適用場景**：
- 用戶數量較少（< 100）
- 消息頻率不高
- 前端過濾足夠

**優點**：
- 實現簡單
- 無需額外追蹤
- 易於維護

### 選項 B：實現按房間廣播（高效）

**適用場景**：
- 用戶數量較多（> 100）
- 多個房間同時活躍
- 需要優化性能

**需要實現**：
1. 追蹤用戶房間關係
2. 房間加入/離開事件
3. 按房間廣播邏輯

---

## 當前實現詳解

### 連接流程

```
用戶登入
  ↓
建立 WebSocket 連接（帶 token）
  ↓
驗證 token，獲取 user_id
  ↓
添加到 active_connections[user_id]
  ↓
連接建立完成
```

### 廣播流程

```
事件發生（如新消息）
  ↓
調用 broadcast() 或 broadcast_to_room()
  ↓
遍歷所有 active_connections
  ↓
發送給每個連接
  ↓
前端接收並過濾（根據 roomId 等）
```

### 數據結構

```python
# 單例模式，全域共享
websocket_manager = ConnectionManager()

# 連接存儲
active_connections = {
    "user_1": [ws1, ws2],  # 用戶 1 有 2 個連接（多設備）
    "user_2": [ws3],       # 用戶 2 有 1 個連接
}

# 當前沒有房間追蹤
# user_rooms = {}  # 未實現
```

---

## 性能分析

### 當前全域廣播

假設：
- 10 個用戶在線
- 1 個用戶發送消息
- 消息發送給：10 個用戶 × 平均 1.5 個連接 = 15 次發送

### 按房間廣播（優化後）

假設：
- 10 個用戶在線
- 房間 A：3 個用戶
- 房間 B：5 個用戶
- 房間 C：2 個用戶
- 1 個用戶在房間 A 發送消息
- 消息發送給：3 個用戶 × 平均 1.5 個連接 = 4.5 次發送

**效率提升**：約 70% 減少不必要的發送

---

## 建議

### 當前階段：保持全域廣播

**理由**：
1. 實現簡單，易於維護
2. 用戶數量還不多
3. 前端過濾已經足夠
4. 可以後續優化

### 未來優化：實現按房間廣播

**當以下情況出現時考慮優化**：
- 用戶數量 > 100
- 房間數量 > 10
- 消息頻率 > 10 條/秒
- 性能成為瓶頸

---

## 實現按房間廣播的代碼示例

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_rooms: Dict[str, Set[str]] = {}  # 新增：追蹤用戶房間
    
    async def join_room(self, user_id: str, room_id: str):
        """用戶加入房間"""
        if user_id not in self.user_rooms:
            self.user_rooms[user_id] = set()
        self.user_rooms[user_id].add(room_id)
    
    async def leave_room(self, user_id: str, room_id: str):
        """用戶離開房間"""
        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(room_id)
            if not self.user_rooms[user_id]:
                del self.user_rooms[user_id]
    
    async def broadcast_to_room(self, message: dict, room_id: str):
        """只發送給在該房間的用戶"""
        target_users = [
            user_id for user_id, rooms in self.user_rooms.items()
            if room_id in rooms
        ]
        
        for user_id in target_users:
            for connection in self.active_connections.get(user_id, []):
                try:
                    await connection.send_json(message)
                except:
                    pass
```

---

## 總結

**當前實現**：全域 WebSocket 廣播
- 所有事件發送給所有連接的用戶
- 前端負責過濾不需要的事件
- 簡單但效率較低

**優化方向**：按房間分組廣播
- 只發送給相關房間的用戶
- 需要追蹤用戶房間關係
- 更高效但實現較複雜

**建議**：當前保持全域廣播，未來根據需求優化。

