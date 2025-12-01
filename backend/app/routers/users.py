from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRelationship
from app.schemas import UserResponse, UserUpdateRequest
from app.dependencies import get_current_user
from app.auth import get_password_hash
from app.websocket import websocket_manager

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """獲取所有用戶列表（排除被封鎖的用戶）"""
    # 獲取當前用戶封鎖的用戶 ID
    blocked_ids = [
        rel.target_id for rel in db.query(UserRelationship).filter(
            UserRelationship.user_id == current_user.id,
            UserRelationship.relationship_type == "blocked"
        ).all()
    ]
    
    # 查詢所有用戶，排除被封鎖的
    users = db.query(User).filter(~User.id.in_(blocked_ids) if blocked_ids else True).all()
    
    # 構建響應
    result = []
    for user in users:
        # 獲取該用戶的收藏和封鎖列表
        favorites = []
        blocked = []
        relationships = db.query(UserRelationship).filter(UserRelationship.user_id == user.id).all()
        for rel in relationships:
            if rel.relationship_type == "favorite":
                favorites.append(rel.target_id)
            elif rel.relationship_type == "blocked":
                blocked.append(rel.target_id)
        
        result.append(UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            avatar=user.avatar,
            is_online=user.is_online,
            bio=user.bio,
            favorites=favorites,
            blocked=blocked
        ))
    
    return result


@router.put("/{user_id}/profile", response_model=UserResponse)
async def update_profile(
    user_id: str,
    request: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新用戶個人資料"""
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )
    
    try:
        # 更新字段
        if request.name is not None:
            current_user.name = request.name
        if request.avatar is not None:
            # 檢查是否為 base64 數據（不允許）
            if request.avatar.startswith('data:image'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Base64 images are not allowed. Please use the upload endpoint to upload avatar as a file."
                )
            # 驗證 avatar URL 格式（應該是 /api/uploads/avatars/... 或 http(s)://...）
            if not (request.avatar.startswith('/api/uploads/') or request.avatar.startswith('http://') or request.avatar.startswith('https://')):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid avatar URL format. Avatar must be uploaded via the upload endpoint."
                )
            current_user.avatar = request.avatar
        if request.bio is not None:
            current_user.bio = request.bio
        if request.password is not None and request.password.strip():
            current_user.password_hash = get_password_hash(request.password)
        
        db.commit()
        db.refresh(current_user)
        
        # 廣播用戶更新事件（異步執行，失敗不影響主流程）
        try:
            await websocket_manager.broadcast_user_update(current_user)
        except Exception as e:
            # WebSocket 廣播失敗不應該影響更新流程
            print(f"Warning: Failed to broadcast user update: {e}")
        
        # 獲取用戶關係
        favorites = []
        blocked = []
        relationships = db.query(UserRelationship).filter(UserRelationship.user_id == current_user.id).all()
        for rel in relationships:
            if rel.relationship_type == "favorite":
                favorites.append(rel.target_id)
            elif rel.relationship_type == "blocked":
                blocked.append(rel.target_id)
        
        return UserResponse(
            id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            avatar=current_user.avatar,
            is_online=current_user.is_online,
            bio=current_user.bio,
            favorites=favorites,
            blocked=blocked
        )
    except HTTPException:
        # 重新拋出 HTTP 異常
        raise
    except Exception as e:
        # 資料庫操作失敗，回滾並返回錯誤
        db.rollback()
        print(f"Error updating profile for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )


@router.post("/{user_id}/favorites/{target_id}")
async def toggle_favorite(
    user_id: str,
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """切換收藏狀態"""
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own favorites"
        )
    
    if user_id == target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot favorite yourself"
        )
    
    # 檢查目標用戶是否存在
    target_user = db.query(User).filter(User.id == target_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    # 查找現有關係
    existing = db.query(UserRelationship).filter(
        UserRelationship.user_id == user_id,
        UserRelationship.target_id == target_id,
        UserRelationship.relationship_type == "favorite"
    ).first()
    
    if existing:
        # 移除收藏
        db.delete(existing)
        db.commit()
        await websocket_manager.broadcast_user_update(current_user)
        return {"message": "Removed from favorites", "is_favorite": False}
    else:
        # 添加收藏（先檢查是否被封鎖，如果被封鎖則先解封）
        blocked_rel = db.query(UserRelationship).filter(
            UserRelationship.user_id == user_id,
            UserRelationship.target_id == target_id,
            UserRelationship.relationship_type == "blocked"
        ).first()
        
        if blocked_rel:
            db.delete(blocked_rel)
        
        # 添加收藏關係
        new_rel = UserRelationship(
            user_id=user_id,
            target_id=target_id,
            relationship_type="favorite"
        )
        db.add(new_rel)
        db.commit()
        await websocket_manager.broadcast_user_update(current_user)
        return {"message": "Added to favorites", "is_favorite": True}


@router.post("/{user_id}/block/{target_id}")
async def block_user(
    user_id: str,
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """封鎖用戶"""
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own blocks"
        )
    
    if user_id == target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot block yourself"
        )
    
    # 檢查目標用戶是否存在
    target_user = db.query(User).filter(User.id == target_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    # 檢查是否已經封鎖
    existing = db.query(UserRelationship).filter(
        UserRelationship.user_id == user_id,
        UserRelationship.target_id == target_id,
        UserRelationship.relationship_type == "blocked"
    ).first()
    
    if existing:
        return {"message": "User already blocked", "is_blocked": True}
    
    # 移除收藏關係（如果存在）
    favorite_rel = db.query(UserRelationship).filter(
        UserRelationship.user_id == user_id,
        UserRelationship.target_id == target_id,
        UserRelationship.relationship_type == "favorite"
    ).first()
    
    if favorite_rel:
        db.delete(favorite_rel)
    
    # 添加封鎖關係
    new_rel = UserRelationship(
        user_id=user_id,
        target_id=target_id,
        relationship_type="blocked"
    )
    db.add(new_rel)
    db.commit()
    
    await websocket_manager.broadcast_user_update(current_user)
    return {"message": "User blocked successfully", "is_blocked": True}


@router.post("/{user_id}/unblock/{target_id}")
async def unblock_user(
    user_id: str,
    target_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """解封用戶"""
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own blocks"
        )
    
    # 查找封鎖關係
    blocked_rel = db.query(UserRelationship).filter(
        UserRelationship.user_id == user_id,
        UserRelationship.target_id == target_id,
        UserRelationship.relationship_type == "blocked"
    ).first()
    
    if not blocked_rel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not blocked"
        )
    
    db.delete(blocked_rel)
    db.commit()
    
    await websocket_manager.broadcast_user_update(current_user)
    return {"message": "User unblocked successfully", "is_blocked": False}

