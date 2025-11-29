from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Message, Room, User, UserRelationship
from app.schemas import MessageResponse, MessageCreateRequest, MessageSearchResponse
from app.dependencies import get_current_user
from app.websocket import websocket_manager
from datetime import datetime

router = APIRouter()


@router.get("/rooms/{room_id}", response_model=list[MessageResponse])
async def get_messages(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """獲取房間的所有消息"""
    # 檢查房間是否存在
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # 獲取當前用戶封鎖的用戶 ID
    blocked_ids = [
        rel.target_id for rel in db.query(UserRelationship).filter(
            UserRelationship.user_id == current_user.id,
            UserRelationship.relationship_type == "blocked"
        ).all()
    ]
    
    # 查詢消息，排除被封鎖用戶的消息
    query = db.query(Message).filter(Message.room_id == room_id)
    if blocked_ids:
        query = query.filter(~Message.sender_id.in_(blocked_ids))
    
    messages = query.order_by(Message.timestamp.asc()).all()
    
    return [MessageResponse(
        id=msg.id,
        room_id=msg.room_id,
        sender_id=msg.sender_id,
        sender_name=msg.sender_name,
        sender_avatar=msg.sender_avatar,
        content=msg.content,
        type=msg.type,
        timestamp=msg.timestamp
    ) for msg in messages]


@router.post("", response_model=MessageResponse)
async def send_message(
    request: MessageCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """發送消息"""
    # 檢查房間是否存在
    room = db.query(Room).filter(Room.id == request.room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # 創建消息
    new_message = Message(
        room_id=request.room_id,
        sender_id=current_user.id,
        sender_name=current_user.name,
        sender_avatar=current_user.avatar,
        content=request.content,
        type=request.type
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # 廣播新消息事件
    message_response = MessageResponse(
        id=new_message.id,
        room_id=new_message.room_id,
        sender_id=new_message.sender_id,
        sender_name=new_message.sender_name,
        sender_avatar=new_message.sender_avatar,
        content=new_message.content,
        type=new_message.type,
        timestamp=new_message.timestamp
    )
    await websocket_manager.broadcast_new_message(message_response)
    
    return message_response


@router.get("/search", response_model=list[MessageSearchResponse])
async def search_messages(
    query: str = Query(..., min_length=3, description="Search query (minimum 3 characters)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """搜索消息歷史"""
    # 獲取當前用戶封鎖的用戶 ID
    blocked_ids = [
        rel.target_id for rel in db.query(UserRelationship).filter(
            UserRelationship.user_id == current_user.id,
            UserRelationship.relationship_type == "blocked"
        ).all()
    ]
    
    # 搜索文字消息（MySQL 使用 LIKE，不區分大小寫）
    search_query = db.query(Message).filter(
        Message.type == "text",
        func.lower(Message.content).like(f"%{query.lower()}%")
    )
    
    if blocked_ids:
        search_query = search_query.filter(~Message.sender_id.in_(blocked_ids))
    
    messages = search_query.order_by(Message.timestamp.desc()).limit(50).all()
    
    # 獲取所有相關房間信息
    room_ids = list(set([msg.room_id for msg in messages]))
    rooms = {room.id: room.name for room in db.query(Room).filter(Room.id.in_(room_ids)).all()}
    
    # 構建響應
    result = []
    for msg in messages:
        result.append(MessageSearchResponse(
            id=msg.id,
            room_id=msg.room_id,
            room_name=rooms.get(msg.room_id, "Unknown Room"),
            sender_id=msg.sender_id,
            sender_name=msg.sender_name,
            sender_avatar=msg.sender_avatar,
            content=msg.content,
            type=msg.type,
            timestamp=msg.timestamp
        ))
    
    return result

