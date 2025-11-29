from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ============ 認證相關 ============
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ============ 用戶相關 ============
class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: str
    is_online: bool
    bio: Optional[str] = None
    favorites: List[str] = []
    blocked: List[str] = []
    
    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    password: Optional[str] = None
    bio: Optional[str] = None


# ============ 房間相關 ============
class RoomResponse(BaseModel):
    id: str
    name: str
    is_private: bool
    created_by: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True


class RoomCreateRequest(BaseModel):
    name: str
    is_private: bool = False
    password: Optional[str] = None
    description: Optional[str] = None


class RoomJoinRequest(BaseModel):
    password: Optional[str] = None


# ============ 消息相關 ============
class MessageResponse(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender_name: str
    sender_avatar: str
    content: str
    type: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class MessageCreateRequest(BaseModel):
    room_id: str
    content: str
    type: str = "text"  # 'text' or 'image'


class MessageSearchResponse(BaseModel):
    id: str
    room_id: str
    room_name: str
    sender_id: str
    sender_name: str
    sender_avatar: str
    content: str
    type: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


# ============ WebSocket 事件 ============
class WebSocketEvent(BaseModel):
    type: str
    payload: dict


# 更新前向引用
TokenResponse.model_rebuild()

