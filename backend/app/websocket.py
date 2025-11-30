from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
from app.models import User
from app.auth import decode_access_token
from app.database import SessionLocal
import json


class ConnectionManager:
    def __init__(self):
        # 存儲所有活躍連接：{user_id: [websocket1, websocket2, ...]}
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # 追蹤用戶所在的房間：{user_id: {room_id1, room_id2, ...}}
        self.user_rooms: Dict[str, set] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """建立 WebSocket 連接"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        total_connections = sum(len(conns) for conns in self.active_connections.values())
        print(f"[WebSocket] User {user_id} connected. Total users: {len(self.active_connections)}, Total connections: {total_connections}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """斷開 WebSocket 連接"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # 清理用戶的房間關係（用戶完全離線）
                if user_id in self.user_rooms:
                    del self.user_rooms[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        """發送消息給特定用戶"""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)
            
            # 清理斷開的連接
            for conn in disconnected:
                self.disconnect(conn, user_id)
    
    async def broadcast(self, message: dict):
        """廣播消息給所有連接的用戶"""
        if not self.active_connections:
            print(f"[WebSocket] No active connections to broadcast: {message.get('type')}")
            return
        
        total_connections = sum(len(conns) for conns in self.active_connections.values())
        print(f"[WebSocket] Broadcasting {message.get('type')} to {len(self.active_connections)} users ({total_connections} connections)")
        
        disconnected_users = []
        for user_id, connections in self.active_connections.items():
            disconnected = []
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"[WebSocket] Error sending to user {user_id}: {e}")
                    disconnected.append(connection)
            
            # 清理斷開的連接
            for conn in disconnected:
                self.disconnect(conn, user_id)
                if not self.active_connections.get(user_id):
                    disconnected_users.append(user_id)
        
        # 清理空的用戶連接列表
        for user_id in disconnected_users:
            if user_id in self.active_connections and not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def join_room(self, user_id: str, room_id: str):
        """用戶加入房間"""
        if user_id not in self.user_rooms:
            self.user_rooms[user_id] = set()
        self.user_rooms[user_id].add(room_id)
        print(f"[WebSocket] User {user_id} joined room {room_id}")
    
    async def leave_room(self, user_id: str, room_id: str):
        """用戶離開房間"""
        if user_id in self.user_rooms:
            self.user_rooms[user_id].discard(room_id)
            if not self.user_rooms[user_id]:
                del self.user_rooms[user_id]
            print(f"[WebSocket] User {user_id} left room {room_id}")
    
    async def broadcast_to_room(self, message: dict, room_id: str):
        """廣播消息給特定房間的所有用戶"""
        if not self.active_connections:
            print(f"[WebSocket] No active connections to broadcast to room {room_id}")
            return
        
        # 找到在該房間的所有用戶
        target_users = [
            user_id for user_id, rooms in self.user_rooms.items()
            if room_id in rooms
        ]
        
        if not target_users:
            print(f"[WebSocket] No users in room {room_id} to broadcast")
            return
        
        total_sent = 0
        disconnected_users = []
        
        for user_id in target_users:
            connections = self.active_connections.get(user_id, [])
            disconnected = []
            for connection in connections:
                try:
                    await connection.send_json(message)
                    total_sent += 1
                except Exception as e:
                    print(f"[WebSocket] Error sending to user {user_id} in room {room_id}: {e}")
                    disconnected.append(connection)
            
            # 清理斷開的連接
            for conn in disconnected:
                self.disconnect(conn, user_id)
                if not self.active_connections.get(user_id):
                    disconnected_users.append(user_id)
        
        print(f"[WebSocket] Broadcasting {message.get('type')} to room {room_id}: {len(target_users)} users, {total_sent} connections")
        
        # 清理空的用戶連接列表
        for user_id in disconnected_users:
            if user_id in self.active_connections and not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # 同時清理房間關係
                if user_id in self.user_rooms:
                    del self.user_rooms[user_id]


# 全局 WebSocket 管理器
websocket_manager = ConnectionManager()


async def get_user_from_token(token: str) -> User | None:
    """從 token 獲取用戶"""
    payload = decode_access_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        return user
    finally:
        db.close()


# 添加廣播方法到 ConnectionManager
async def broadcast_new_message(self, message):
    """廣播新消息事件（只發送給該房間的用戶）"""
    event = {
        "type": "NEW_MESSAGE",
        "payload": {
            "id": message.id,
            "roomId": message.room_id,
            "senderId": message.sender_id,
            "senderName": message.sender_name,
            "senderAvatar": message.sender_avatar,
            "content": message.content,
            "type": message.type,
            "timestamp": message.timestamp.isoformat() if hasattr(message.timestamp, 'isoformat') else str(message.timestamp)
        }
    }
    # 使用按房間廣播，只發送給該房間的用戶
    await self.broadcast_to_room(event, message.room_id)


async def broadcast_room_created(self, room):
    """廣播房間創建事件"""
    event = {
        "type": "ROOM_CREATED",
        "payload": {
            "id": room.id,
            "name": room.name,
            "isPrivate": room.is_private,
            "createdBy": room.created_by,
            "description": room.description
        }
    }
    print(f"[WebSocket] Broadcasting ROOM_CREATED: {room.id} - {room.name}")
    print(f"[WebSocket] Active connections: {len(self.active_connections)} users")
    await self.broadcast(event)


async def broadcast_room_deleted(self, room_id: str):
    """廣播房間刪除事件"""
    event = {
        "type": "ROOM_DELETED",
        "payload": {
            "roomId": room_id
        }
    }
    await self.broadcast(event)


async def broadcast_room_updated(self, room):
    """廣播房間更新事件"""
    event = {
        "type": "ROOM_UPDATED",
        "payload": {
            "id": room.id,
            "name": room.name,
            "isPrivate": room.is_private,
            "createdBy": room.created_by,
            "description": room.description
        }
    }
    await self.broadcast(event)


async def broadcast_user_update(self, user):
    """廣播用戶更新事件"""
    from app.database import SessionLocal
    from app.models import UserRelationship
    
    db = SessionLocal()
    try:
        # 獲取用戶關係
        favorites = []
        blocked = []
        relationships = db.query(UserRelationship).filter(UserRelationship.user_id == user.id).all()
        for rel in relationships:
            if rel.relationship_type == "favorite":
                favorites.append(rel.target_id)
            elif rel.relationship_type == "blocked":
                blocked.append(rel.target_id)
        
        event = {
            "type": "USER_UPDATE",
            "payload": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "avatar": user.avatar,
                "isOnline": user.is_online,
                "bio": user.bio,
                "favorites": favorites,
                "blocked": blocked
            }
        }
        await self.broadcast(event)
    finally:
        db.close()


async def broadcast_user_joined(self, user):
    """廣播用戶加入事件"""
    event = {
        "type": "USER_JOINED",
        "payload": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "avatar": user.avatar,
            "isOnline": user.is_online,
            "bio": user.bio,
            "favorites": [],
            "blocked": []
        }
    }
    await self.broadcast(event)


async def broadcast_user_left(self, user_id: str):
    """廣播用戶離線事件"""
    event = {
        "type": "USER_LEFT",
        "payload": {
            "userId": user_id
        }
    }
    await self.broadcast(event)


# 將方法綁定到 ConnectionManager 類
ConnectionManager.broadcast_new_message = broadcast_new_message
ConnectionManager.broadcast_room_created = broadcast_room_created
ConnectionManager.broadcast_room_deleted = broadcast_room_deleted
ConnectionManager.broadcast_room_updated = broadcast_room_updated
ConnectionManager.broadcast_user_update = broadcast_user_update
ConnectionManager.broadcast_user_joined = broadcast_user_joined
ConnectionManager.broadcast_user_left = broadcast_user_left

async def handle_websocket(websocket: WebSocket):
    """處理 WebSocket 連接"""
    # 從查詢參數獲取 token
    query_params = dict(websocket.query_params)
    token = query_params.get("token")
    
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    # 驗證用戶
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    # 建立連接
    await websocket_manager.connect(websocket, user.id)
    
    # 確保用戶在線狀態已更新並廣播
    db = SessionLocal()
    try:
        db_user = db.query(User).filter(User.id == user.id).first()
        if db_user and not db_user.is_online:
            # 如果用戶狀態不是在線，更新為在線並廣播
            db_user.is_online = True
            db.commit()
            db.refresh(db_user)
            print(f"[WebSocket] User {user.id} marked as online via WebSocket connection")
            # 廣播用戶上線事件
            await websocket_manager.broadcast_user_update(db_user)
    except Exception as e:
        print(f"[WebSocket] Error updating user online status: {e}")
        db.rollback()
    finally:
        db.close()
    
    try:
        while True:
            # 接收消息（如果需要雙向通信）
            data = await websocket.receive_text()
            
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
            
            # 這裡可以處理其他客戶端發送的消息
            # 目前主要實現服務器到客戶端的推送
    except WebSocketDisconnect:
        print(f"[WebSocket] User {user.id} disconnected")
        websocket_manager.disconnect(websocket, user.id)
        
        # 更新用戶離線狀態
        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.id == user.id).first()
            if db_user:
                db_user.is_online = False
                db.commit()
                print(f"[WebSocket] User {user.id} marked as offline")
                # 廣播用戶離線事件
                await websocket_manager.broadcast_user_left(user.id)
        except Exception as e:
            print(f"[WebSocket] Error updating user offline status: {e}")
            db.rollback()
        finally:
            db.close()

