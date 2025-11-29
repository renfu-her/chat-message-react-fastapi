from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# 創建資料庫連接字符串
DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}?charset=utf8mb4"

# 創建引擎
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_timeout=20,  # 連接池超時時間（秒）
    connect_args={
        "connect_timeout": 10,  # MySQL 連接超時時間（秒）
    },
    echo=False  # 設為 True 可以看到 SQL 語句
)

# 創建 SessionLocal 類
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 創建 Base 類
Base = declarative_base()


# 依賴注入：獲取資料庫會話
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

