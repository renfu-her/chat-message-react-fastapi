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
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """建立 WebSocket 連接"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """斷開 WebSocket 連接"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
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
        disconnected_users = []
        for user_id, connections in self.active_connections.items():
            disconnected = []
            for connection in connections:
                try:
                    await connection.send_json(message)
                except:
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
    
    async def broadcast_to_room(self, message: dict, room_id: str):
        """廣播消息給特定房間的所有用戶（需要從資料庫查詢房間成員）"""
        # 這裡簡化處理，實際應該查詢房間成員
        # 目前廣播給所有連接的用戶，前端會根據 room_id 過濾
        await self.broadcast(message)


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
    """廣播新消息事件"""
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
    await self.broadcast(event)


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
    
    try:
        while True:
            # 接收消息（如果需要雙向通信）
            data = await websocket.receive_text()
            # 這裡可以處理客戶端發送的消息
            # 目前只實現服務器到客戶端的推送
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, user.id)

