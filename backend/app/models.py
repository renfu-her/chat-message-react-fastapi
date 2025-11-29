from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


def generate_id():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=False)
    is_online = Column(Boolean, default=False, nullable=False)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 關係
    created_rooms = relationship("Room", back_populates="creator", foreign_keys="Room.created_by")
    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    
    # 用戶關係（收藏和封鎖）
    favorites_as_user = relationship(
        "UserRelationship",
        foreign_keys="UserRelationship.user_id",
        cascade="all, delete-orphan",
        overlaps="blocked_as_user",
        primaryjoin="(User.id == UserRelationship.user_id) & (UserRelationship.relationship_type == 'favorite')",
        viewonly=False
    )
    blocked_as_user = relationship(
        "UserRelationship",
        foreign_keys="UserRelationship.user_id",
        cascade="all, delete-orphan",
        overlaps="favorites_as_user",
        primaryjoin="(User.id == UserRelationship.user_id) & (UserRelationship.relationship_type == 'blocked')",
        viewonly=False
    )


class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    name = Column(String(100), nullable=False)
    is_private = Column(Boolean, default=False, nullable=False)
    password_hash = Column(String(255), nullable=True)  # 僅私有房間需要
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 關係
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_rooms")
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    room_id = Column(String(36), ForeignKey("rooms.id"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    sender_name = Column(String(100), nullable=False)  # 冗余字段，避免查詢用戶表
    sender_avatar = Column(String(500), nullable=False)  # 冗余字段
    content = Column(Text, nullable=False)
    type = Column(String(20), default="text", nullable=False)  # 'text' or 'image'
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # 關係
    room = relationship("Room", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")


class UserRelationship(Base):
    __tablename__ = "user_relationships"
    
    id = Column(String(36), primary_key=True, default=generate_id)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    target_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    relationship_type = Column(String(20), nullable=False)  # 'favorite' or 'blocked'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 關係 - 使用 viewonly 因為我們已經在 User 模型中定義了具體的關係
    user = relationship("User", foreign_keys=[user_id], viewonly=True)
    
    # 唯一約束：同一用戶對同一目標只能有一種關係類型
    __table_args__ = (
        {"mysql_engine": "InnoDB"},
    )

