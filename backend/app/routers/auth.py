from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.auth import verify_password, get_password_hash, create_access_token
from app.dependencies import get_current_user
from app.websocket import websocket_manager

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """用戶登入"""
    # 查找用戶
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # 設置在線狀態
    user.is_online = True
    db.commit()
    db.refresh(user)
    
    # 創建 token
    access_token = create_access_token(data={"sub": user.id})
    
    # 獲取用戶關係（收藏和封鎖）
    favorites = []
    blocked = []
    from app.models import UserRelationship
    relationships = db.query(UserRelationship).filter(UserRelationship.user_id == user.id).all()
    for rel in relationships:
        if rel.relationship_type == "favorite":
            favorites.append(rel.target_id)
        elif rel.relationship_type == "blocked":
            blocked.append(rel.target_id)
    
    user_dict = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar,
        "is_online": user.is_online,
        "bio": user.bio,
        "favorites": favorites,
        "blocked": blocked
    }
    
    # 廣播用戶更新事件（異步執行，避免阻塞）
    import asyncio
    asyncio.create_task(websocket_manager.broadcast_user_update(user))
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**user_dict)
    )


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """用戶註冊"""
    # 檢查 email 是否已存在
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 生成頭像 URL
    import urllib.parse
    avatar_url = f"https://api.dicebear.com/7.x/initials/svg?seed={urllib.parse.quote(request.name)}"
    
    # 創建新用戶
    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=get_password_hash(request.password),
        avatar=avatar_url,
        is_online=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 創建 token
    access_token = create_access_token(data={"sub": new_user.id})
    
    user_dict = {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "avatar": new_user.avatar,
        "is_online": new_user.is_online,
        "bio": new_user.bio,
        "favorites": [],
        "blocked": []
    }
    
    # 廣播用戶加入事件（在返回響應後異步執行，避免阻塞）
    try:
        await websocket_manager.broadcast_user_joined(new_user)
    except Exception as e:
        # WebSocket 廣播失敗不應該影響註冊流程
        print(f"Warning: Failed to broadcast user joined: {e}")
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(**user_dict)
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """用戶登出"""
    # 設置離線狀態
    current_user.is_online = False
    db.commit()
    
    # 廣播用戶離線事件
    await websocket_manager.broadcast_user_left(current_user.id)
    
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """獲取當前用戶信息"""
    # 獲取用戶關係
    favorites = []
    blocked = []
    from app.models import UserRelationship
    relationships = db.query(UserRelationship).filter(UserRelationship.user_id == current_user.id).all()
    for rel in relationships:
        if rel.relationship_type == "favorite":
            favorites.append(rel.target_id)
        elif rel.relationship_type == "blocked":
            blocked.append(rel.target_id)
    
    user_dict = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "avatar": current_user.avatar,
        "is_online": current_user.is_online,
        "bio": current_user.bio,
        "favorites": favorites,
        "blocked": blocked
    }
    
    return UserResponse(**user_dict)

