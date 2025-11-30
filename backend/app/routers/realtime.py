"""
實時通信備用方案：Long Polling 端點
當 WebSocket 不可用時，前端可以使用此端點進行長輪詢
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Message, Room, UserRelationship
from datetime import datetime, timedelta
from typing import Optional, List
import json

router = APIRouter()


@router.get("/poll")
async def long_poll(
    lastMessageId: Optional[str] = Query(None, alias="lastMessageId"),
    lastTimestamp: Optional[str] = Query(None, alias="lastTimestamp"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Long Polling 端點
    客戶端發送請求後，服務器會立即返回新事件（如果有），否則返回空數組
    客戶端會立即發起下一次請求，實現類似 WebSocket 的實時效果
    
    Args:
        lastMessageId: 客戶端最後收到的消息 ID，用於增量獲取消息
        lastTimestamp: 客戶端最後收到事件的時間戳，用於增量獲取其他事件
    """
    # 獲取當前用戶封鎖的用戶 ID
    blocked_ids = [
        rel.target_id for rel in db.query(UserRelationship).filter(
            UserRelationship.user_id == current_user.id,
            UserRelationship.relationship_type == "blocked"
        ).all()
    ]
    
    # 構建事件列表
    events = []
    current_timestamp = datetime.utcnow()
    
    # 1. 檢查新消息（如果有 lastMessageId，只獲取之後的消息）
    if lastMessageId:
        last_message = db.query(Message).filter(Message.id == lastMessageId).first()
        if last_message:
            # 獲取指定消息之後的新消息
            new_messages = db.query(Message).filter(
                Message.timestamp > last_message.timestamp
            ).order_by(Message.timestamp.asc()).limit(50).all()
        else:
            new_messages = []
    else:
        # 首次請求，不返回歷史消息（避免一次性返回太多數據）
        new_messages = []
    
    # 過濾被封鎖用戶的消息
    for msg in new_messages:
        if msg.sender_id not in blocked_ids:
            events.append({
                "type": "NEW_MESSAGE",
                "payload": {
                    "id": msg.id,
                    "roomId": msg.room_id,
                    "senderId": msg.sender_id,
                    "senderName": msg.sender_name,
                    "senderAvatar": msg.sender_avatar,
                    "content": msg.content,
                    "type": msg.type,
                    "timestamp": msg.timestamp.isoformat() if hasattr(msg.timestamp, 'isoformat') else str(msg.timestamp)
                }
            })
    
    # 2. 檢查房間更新（簡化處理：只在首次請求時返回所有房間）
    # 實際應用中可以使用 lastTimestamp 來只返回更新的房間
    if not lastTimestamp:
        rooms = db.query(Room).all()
        for room in rooms:
            events.append({
                "type": "ROOM_CREATED",
                "payload": {
                    "id": room.id,
                    "name": room.name,
                    "isPrivate": room.is_private,
                    "createdBy": room.created_by,
                    "description": room.description
                }
            })
    
    # 3. 檢查用戶狀態更新（簡化處理：只在首次請求時返回所有在線用戶）
    # 實際應用中可以使用 lastTimestamp 來只返回更新的用戶
    if not lastTimestamp:
        online_users = db.query(User).filter(User.is_online == True).all()
        for user in online_users:
            if user.id not in blocked_ids and user.id != current_user.id:
                # 獲取用戶關係
                favorites = []
                blocked = []
                relationships = db.query(UserRelationship).filter(UserRelationship.user_id == user.id).all()
                for rel in relationships:
                    if rel.relationship_type == "favorite":
                        favorites.append(rel.target_id)
                    elif rel.relationship_type == "blocked":
                        blocked.append(rel.target_id)
                
                events.append({
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
                })
    
    # 返回事件列表（即使為空也立即返回，客戶端會立即發起下一次請求）
    return {
        "events": events,
        "timestamp": current_timestamp.isoformat()
    }


@router.get("/status")
async def get_realtime_status(
    current_user: User = Depends(get_current_user)
):
    """
    獲取實時連接狀態
    用於前端檢查當前應該使用哪種連接方式
    """
    return {
        "websocket_available": True,  # 可以通過嘗試連接來檢測
        "longpolling_available": True,
        "recommended": "websocket"  # 推薦使用 WebSocket
    }

