from pydantic_settings import BaseSettings
from pathlib import Path
import os

# 獲取後端代碼的目錄（backend/app/）
BACKEND_DIR = Path(__file__).parent.parent.resolve()

class Settings(BaseSettings):
    # 資料庫配置
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "chat-react-fastapi"
    
    # JWT 配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天
    
    # CORS 配置
    CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # 文件上傳配置
    # 如果環境變量 UPLOAD_DIR 是絕對路徑，使用它；否則基於後端目錄
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    
    class Config:
        env_file = ".env"
    
    @property
    def upload_dir_absolute(self) -> Path:
        """獲取上傳目錄的絕對路徑"""
        upload_dir = os.getenv("UPLOAD_DIR_ABSOLUTE", self.UPLOAD_DIR)
        if os.path.isabs(upload_dir):
            return Path(upload_dir).resolve()
        else:
            # 相對路徑，基於後端目錄
            return (BACKEND_DIR / upload_dir).resolve()


settings = Settings()

