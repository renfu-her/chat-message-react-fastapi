from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.database import engine, Base
from app.routers import auth, users, rooms, messages
from app.websocket import websocket_manager


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
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
app.include_router(auth.router, prefix="/api/auth", tags=["認證"])
app.include_router(users.router, prefix="/api/users", tags=["用戶"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["房間"])
app.include_router(messages.router, prefix="/api/messages", tags=["消息"])

# WebSocket 端點
from app.websocket import handle_websocket
app.add_api_route("/ws", handle_websocket, methods=["GET"])


@app.get("/")
async def root():
    return {"message": "Chat API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

