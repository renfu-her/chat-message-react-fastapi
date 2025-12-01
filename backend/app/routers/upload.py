"""
文件上傳路由
處理圖片上傳並保存為實體文件（轉換為 WebP 格式）
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
from PIL import Image
import io

router = APIRouter()


@router.get("/check/{file_path:path}")
async def check_file(file_path: str):
    """檢查文件是否存在（調試用）"""
    file_full_path = UPLOAD_DIR / file_path
    if file_full_path.exists():
        return {
            "exists": True,
            "path": str(file_full_path),
            "size": file_full_path.stat().st_size
        }
    else:
        return {
            "exists": False,
            "path": str(file_full_path),
            "upload_dir": str(UPLOAD_DIR)
        }

# 確保上傳目錄存在（使用絕對路徑，基於後端目錄）
UPLOAD_DIR = settings.upload_dir_absolute
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 創建子目錄
AVATARS_DIR = UPLOAD_DIR / "avatars"
MESSAGES_DIR = UPLOAD_DIR / "messages"
AVATARS_DIR.mkdir(exist_ok=True)
MESSAGES_DIR.mkdir(exist_ok=True)

print(f"[Upload] Upload directory: {UPLOAD_DIR}")
print(f"[Upload] Avatars directory: {AVATARS_DIR}")
print(f"[Upload] Messages directory: {MESSAGES_DIR}")


def convert_to_webp(image_data: bytes, max_size: int = 1920) -> bytes:
    """將圖片轉換為 WebP 格式"""
    try:
        # 打開圖片
        img = Image.open(io.BytesIO(image_data))
        
        # 處理調色板模式（P 模式）
        if img.mode == 'P':
            img = img.convert('RGBA')
        
        # 處理灰度模式（L, LA）
        elif img.mode in ('L', 'LA'):
            if img.mode == 'LA':
                img = img.convert('RGBA')  # 保留透明度
            else:
                img = img.convert('RGB')
        
        # 處理 CMYK 模式
        elif img.mode == 'CMYK':
            img = img.convert('RGB')
        
        # RGBA 和 RGB 模式保持不變（WebP 支持透明度）
        
        # 調整大小（如果太大）
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # 轉換為 WebP（WebP 支持透明度，所以 RGBA 可以直接保存）
        webp_buffer = io.BytesIO()
        save_kwargs = {
            'format': 'WEBP',
            'quality': 85,
            'method': 6  # 最佳壓縮
        }
        # 如果是 RGBA 模式，保存時會自動保留透明度
        img.save(webp_buffer, **save_kwargs)
        webp_data = webp_buffer.getvalue()
        
        return webp_data
    except Exception as e:
        raise Exception(f"Failed to convert image to WebP: {str(e)}")


def save_uploaded_file(file: UploadFile, directory: Path, max_size: int = 1920) -> str:
    """保存上傳的文件並轉換為 WebP 格式，返回相對路徑"""
    # 讀取文件內容
    file.file.seek(0)
    image_data = file.file.read()
    
    # 轉換為 WebP
    webp_data = convert_to_webp(image_data, max_size)
    
    # 生成唯一文件名（始終使用 .webp 擴展名）
    unique_filename = f"{uuid.uuid4()}.webp"
    file_path = directory / unique_filename
    
    # 保存 WebP 文件
    with open(file_path, "wb") as f:
        f.write(webp_data)
    
    # 驗證文件已保存
    if not file_path.exists():
        raise Exception(f"Failed to save file: {file_path}")
    
    print(f"[Upload] File saved as WebP: {file_path} (size: {len(webp_data)} bytes, original: {len(image_data)} bytes)")
    
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
        # 保存文件並轉換為 WebP（頭像最大 800px）
        relative_path = save_uploaded_file(file, AVATARS_DIR, max_size=800)
        
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
        # 保存文件並轉換為 WebP（消息圖片最大 1920px）
        relative_path = save_uploaded_file(file, MESSAGES_DIR, max_size=1920)
        
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

