from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Room, User
from app.schemas import RoomResponse, RoomCreateRequest, RoomJoinRequest, RoomUpdateRequest
from app.dependencies import get_current_user
from app.auth import verify_password, get_password_hash
from app.websocket import websocket_manager

router = APIRouter()


@router.get("", response_model=list[RoomResponse])
async def get_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """獲取所有房間列表"""
    rooms = db.query(Room).all()
    return [RoomResponse(
        id=room.id,
        name=room.name,
        is_private=room.is_private,
        created_by=room.created_by,
        description=room.description
    ) for room in rooms]


@router.post("", response_model=RoomResponse)
async def create_room(
    request: RoomCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """創建新房間"""
    # 如果為私有房間，必須提供密碼
    if request.is_private and not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for private rooms"
        )
    
    # 創建房間
    new_room = Room(
        name=request.name,
        is_private=request.is_private,
        password_hash=get_password_hash(request.password) if request.is_private and request.password else None,
        created_by=current_user.id,
        description=request.description
    )
    
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    
    # 廣播房間創建事件（異步執行，避免阻塞）
    room_response = RoomResponse(
        id=new_room.id,
        name=new_room.name,
        is_private=new_room.is_private,
        created_by=new_room.created_by,
        description=new_room.description
    )
    asyncio.create_task(websocket_manager.broadcast_room_created(room_response))
    
    return room_response


@router.post("/{room_id}/join")
async def join_room(
    room_id: str,
    request: RoomJoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """加入房間（驗證密碼）"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    # 如果是公開房間，直接允許加入
    if not room.is_private:
        return {"message": "Joined room successfully", "room": RoomResponse(
            id=room.id,
            name=room.name,
            is_private=room.is_private,
            created_by=room.created_by,
            description=room.description
        )}
    
    # 如果是創建者，直接允許加入
    if room.created_by == current_user.id:
        return {"message": "Joined room successfully", "room": RoomResponse(
            id=room.id,
            name=room.name,
            is_private=room.is_private,
            created_by=room.created_by,
            description=room.description
        )}
    
    # 私有房間需要驗證密碼
    if not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for private rooms"
        )
    
    if not verify_password(request.password, room.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    return {"message": "Joined room successfully", "room": RoomResponse(
        id=room.id,
        name=room.name,
        is_private=room.is_private,
        created_by=room.created_by,
        description=room.description
    )}


@router.delete("/{room_id}")
async def delete_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """刪除房間（僅創建者可刪除）"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    if room.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only room creator can delete the room"
        )
    
    db.delete(room)
    db.commit()
    
    # 廣播房間刪除事件（異步執行，避免阻塞）
    asyncio.create_task(websocket_manager.broadcast_room_deleted(room_id))
    
    return {"message": "Room deleted successfully"}


@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: str,
    request: RoomUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新房間信息（僅創建者可更新）"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    if room.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only room creator can update the room"
        )
    
    # 更新字段
    if request.name is not None:
        room.name = request.name
    if request.description is not None:
        room.description = request.description
    if request.password is not None and request.password.strip():
        # 更新私有房間密碼
        if room.is_private:
            room.password_hash = get_password_hash(request.password)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot set password for public rooms"
            )
    
    db.commit()
    db.refresh(room)
    
    # 廣播房間更新事件（異步執行，避免阻塞）
    room_response = RoomResponse(
        id=room.id,
        name=room.name,
        is_private=room.is_private,
        created_by=room.created_by,
        description=room.description
    )
    asyncio.create_task(websocket_manager.broadcast_room_updated(room_response))
    
    return room_response

