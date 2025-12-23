from db import get_db_connection

def fix_column():
    conn = get_db_connection()
    if not conn:
        return

    try:
        with conn.cursor() as cur:
            print("🔧 Dropping the wrong column (1536)...")
            cur.execute("ALTER TABLE agent_logs DROP COLUMN IF EXISTS embedding;")
            
            print("✨ Creating the correct column (384)...")
            cur.execute("ALTER TABLE agent_logs ADD COLUMN embedding vector(384);")
            
            conn.commit()
            print("✅ Database dimensions fixed to 384!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_column()