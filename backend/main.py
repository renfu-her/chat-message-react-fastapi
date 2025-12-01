from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# 註冊路由
app.include_router(auth.router, prefix="/api/auth", tags=["認證"])
app.include_router(users.router, prefix="/api/users", tags=["用戶"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["房間"])
app.include_router(messages.router, prefix="/api/messages", tags=["消息"])
app.include_router(realtime.router, prefix="/api/realtime", tags=["實時通信"])
app.include_router(upload.router, prefix="/api/upload", tags=["文件上傳"])

# 靜態文件服務（提供上傳的文件訪問）
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

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

