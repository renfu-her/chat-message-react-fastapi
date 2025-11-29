"""
資料庫初始化腳本
創建資料庫和初始數據
"""
import sys
import pymysql
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User, Room
from app.auth import get_password_hash

def create_database():
    """創建資料庫（如果不存在）"""
    try:
        # 連接到 MySQL 服務器（不指定資料庫）
        connection = pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # 創建資料庫（如果不存在）
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{settings.DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"✓ 資料庫 '{settings.DB_NAME}' 已創建或已存在")
        
        connection.close()
    except Exception as e:
        print(f"✗ 創建資料庫失敗: {e}")
        sys.exit(1)


def create_tables():
    """創建所有資料表"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ 資料表已創建")
    except Exception as e:
        print(f"✗ 創建資料表失敗: {e}")
        sys.exit(1)


def create_initial_data():
    """創建初始數據"""
    db = SessionLocal()
    try:
        # 檢查是否已有數據
        user_count = db.query(User).count()
        if user_count > 0:
            print("✓ 資料庫已有數據，跳過初始化")
            return
        
        # 創建測試用戶
        test_users = [
            {"name": "User One", "email": "user1@test.com", "password": "password123"},
            {"name": "User Two", "email": "user2@test.com", "password": "password123"},
            {"name": "User Three", "email": "user3@test.com", "password": "password123"},
            {"name": "User Four", "email": "user4@test.com", "password": "password123"},
            {"name": "User Five", "email": "user5@test.com", "password": "password123"},
        ]
        
        created_users = []
        for user_data in test_users:
            user = User(
                name=user_data["name"],
                email=user_data["email"],
                password_hash=get_password_hash(user_data["password"]),
                avatar=f"https://api.dicebear.com/7.x/initials/svg?seed={user_data['name']}",
                is_online=False
            )
            db.add(user)
            created_users.append(user)
        
        db.commit()
        
        # 刷新以獲取 ID
        for user in created_users:
            db.refresh(user)
        
        print(f"✓ 創建了 {len(created_users)} 個測試用戶")
        
        # 創建初始房間
        rooms_data = [
            {"name": "General Chat", "is_private": False, "created_by": created_users[0].id, "description": "Open to everyone"},
            {"name": "Developers", "is_private": True, "password": "123", "created_by": created_users[0].id, "description": "Password is 123"},
            {"name": "Random", "is_private": False, "created_by": created_users[1].id, "description": "Talk about anything"},
        ]
        
        from app.models import Room
        created_rooms = []
        for room_data in rooms_data:
            room = Room(
                name=room_data["name"],
                is_private=room_data["is_private"],
                password_hash=get_password_hash(room_data["password"]) if room_data.get("password") else None,
                created_by=room_data["created_by"],
                description=room_data.get("description")
            )
            db.add(room)
            created_rooms.append(room)
        
        db.commit()
        print(f"✓ 創建了 {len(created_rooms)} 個初始房間")
        
    except Exception as e:
        db.rollback()
        print(f"✗ 創建初始數據失敗: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    print("開始初始化資料庫...")
    print(f"資料庫配置: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    print("-" * 50)
    
    create_database()
    create_tables()
    create_initial_data()
    
    print("-" * 50)
    print("✓ 資料庫初始化完成！")
    print("\n測試帳號:")
    print("  Email: user1@test.com")
    print("  Password: password123")

