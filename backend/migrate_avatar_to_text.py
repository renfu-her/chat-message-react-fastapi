"""
資料庫遷移腳本：將 avatar 欄位從 VARCHAR(500) 改為 TEXT

此腳本用於更新現有資料庫結構，將 users.avatar 和 messages.sender_avatar 
從 VARCHAR(500) 改為 TEXT 類型，以支持更長的 base64 編碼圖片。
"""
import sys
import pymysql
from app.config import settings

def migrate_avatar_columns():
    """執行遷移：將 avatar 欄位改為 TEXT"""
    connection = None
    try:
        # 連接到資料庫
        connection = pymysql.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            print("開始遷移資料庫結構...")
            print("-" * 50)
            
            # 檢查 users 表的 avatar 欄位類型
            cursor.execute("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = %s 
                AND TABLE_NAME = 'users' 
                AND COLUMN_NAME = 'avatar'
            """, (settings.DB_NAME,))
            
            result = cursor.fetchone()
            if result:
                current_type = result[0].upper()
                if 'TEXT' in current_type:
                    print("[OK] users.avatar 已經是 TEXT 類型，跳過")
                else:
                    print(f"  發現 users.avatar 為 {result[0]}，正在修改為 TEXT...")
                    cursor.execute("ALTER TABLE users MODIFY COLUMN avatar TEXT NOT NULL")
                    print("[OK] users.avatar 已更新為 TEXT")
            else:
                print("[WARN] 未找到 users.avatar 欄位，可能表不存在")
            
            # 檢查 messages 表的 sender_avatar 欄位類型
            cursor.execute("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = %s 
                AND TABLE_NAME = 'messages' 
                AND COLUMN_NAME = 'sender_avatar'
            """, (settings.DB_NAME,))
            
            result = cursor.fetchone()
            if result:
                current_type = result[0].upper()
                if 'TEXT' in current_type:
                    print("[OK] messages.sender_avatar 已經是 TEXT 類型，跳過")
                else:
                    print(f"  發現 messages.sender_avatar 為 {result[0]}，正在修改為 TEXT...")
                    cursor.execute("ALTER TABLE messages MODIFY COLUMN sender_avatar TEXT NOT NULL")
                    print("[OK] messages.sender_avatar 已更新為 TEXT")
            else:
                print("[WARN] 未找到 messages.sender_avatar 欄位，可能表不存在")
            
            # 提交更改
            connection.commit()
            print("-" * 50)
            print("[OK] 遷移完成！")
            
    except Exception as e:
        print(f"[ERROR] 遷移失敗: {e}")
        if connection:
            connection.rollback()
        sys.exit(1)
    finally:
        if connection:
            connection.close()


if __name__ == "__main__":
    print("資料庫遷移：avatar 欄位類型更新")
    print(f"資料庫: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    print()
    
    migrate_avatar_columns()
    
    print()
    print("現在可以重新啟動後端服務了。")

