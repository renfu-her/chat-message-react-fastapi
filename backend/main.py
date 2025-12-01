from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import uvicorn
from pathlib import Path

from app.database import engine, Base
from app.routers import auth, users, rooms, messages, realtime, upload
from app.websocket import websocket_manager, handle_websocket
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: 創建資料表
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: 清理資源
    pass


app = FastAPI(
    title="Chat API",
    description="FastAPI backend for React chat application",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://chat.ai-tracks.com",
        "http://chat.ai-tracks.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 靜態文件服務（提供上傳的文件訪問）
# 必須在其他路由之前註冊，確保優先匹配
# 使用絕對路徑，確保在不同工作目錄下都能正確訪問
upload_dir = Path(settings.UPLOAD_DIR).resolve()
upload_dir.mkdir(parents=True, exist_ok=True)
print(f"[StaticFiles] Mounting uploads directory: {upload_dir}")

# 使用路由方式提供靜態文件服務（更可靠）
@app.get("/api/uploads/{file_path:path}")
@app.head("/api/uploads/{file_path:path}")
async def serve_uploaded_file(file_path: str):
    """提供上傳的文件訪問"""
    file_full_path = upload_dir / file_path
    
    # 安全檢查：確保文件在上傳目錄內
    try:
        resolved_path = file_full_path.resolve()
        resolved_upload_dir = upload_dir.resolve()
        resolved_path.relative_to(resolved_upload_dir)
    except ValueError:
        print(f"[StaticFiles] Security check failed: {file_full_path} is outside {upload_dir}")
        raise HTTPException(status_code=403, detail="Access denied")
    
    # 調試日誌
    print(f"[StaticFiles] Requested file: {file_path}")
    print(f"[StaticFiles] Full path: {file_full_path}")
    print(f"[StaticFiles] Exists: {file_full_path.exists()}")
    print(f"[StaticFiles] Is file: {file_full_path.is_file() if file_full_path.exists() else 'N/A'}")
    
    if file_full_path.exists() and file_full_path.is_file():
        media_type = "image/webp" if file_path.endswith(".webp") else "application/octet-stream"
        print(f"[StaticFiles] Serving file: {file_full_path} (type: {media_type})")
        return FileResponse(
            path=str(file_full_path),
            media_type=media_type
        )
    else:
        print(f"[StaticFiles] File not found: {file_full_path}")
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

# 註冊路由（在其他路由之後，確保 /api/uploads 優先匹配）
app.include_router(auth.router, prefix="/api/auth", tags=["認證"])
app.include_router(users.router, prefix="/api/users", tags=["用戶"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["房間"])
app.include_router(messages.router, prefix="/api/messages", tags=["消息"])
app.include_router(realtime.router, prefix="/api/realtime", tags=["實時通信"])
app.include_router(upload.router, prefix="/api/upload", tags=["文件上傳"])

# WebSocket 端點
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await handle_websocket(websocket)


@app.get("/")
async def root():
    return {"message": "Chat API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

