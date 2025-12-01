"""
文件上傳路由
處理圖片上傳並保存為實體文件
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.config import settings
import os
import uuid
from pathlib import Path
from datetime import datetime

router = APIRouter()

# 確保上傳目錄存在
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 創建子目錄
AVATARS_DIR = UPLOAD_DIR / "avatars"
MESSAGES_DIR = UPLOAD_DIR / "messages"
AVATARS_DIR.mkdir(exist_ok=True)
MESSAGES_DIR.mkdir(exist_ok=True)


def save_uploaded_file(file: UploadFile, directory: Path) -> str:
    """保存上傳的文件並返回相對路徑"""
    # 生成唯一文件名
    file_ext = Path(file.filename).suffix or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = directory / unique_filename
    
    # 保存文件
    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)
    
    # 返回相對路徑（用於 URL）
    return f"{directory.name}/{unique_filename}"


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """上傳用戶頭像"""
    # 驗證文件類型
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
        )
    
    # 驗證文件大小
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    try:
        # 保存文件
        relative_path = save_uploaded_file(file, AVATARS_DIR)
        
        # 生成 URL（使用相對路徑）
        file_url = f"/api/uploads/{relative_path}"
        
        # 更新用戶頭像
        current_user.avatar = file_url
        db.commit()
        db.refresh(current_user)
        
        return JSONResponse({
            "url": file_url,
            "message": "Avatar uploaded successfully"
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload avatar: {str(e)}"
        )


@router.post("/message-image")
async def upload_message_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """上傳消息圖片"""
    # 驗證文件類型
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
        )
    
    # 驗證文件大小
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    try:
        # 保存文件
        relative_path = save_uploaded_file(file, MESSAGES_DIR)
        
        # 生成 URL
        file_url = f"/api/uploads/{relative_path}"
        
        return JSONResponse({
            "url": file_url,
            "message": "Image uploaded successfully"
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )

