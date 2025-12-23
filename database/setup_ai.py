from db import get_db_connection

def setup_vector_db():
    conn = get_db_connection()
    if not conn:
        return

    try:
        with conn.cursor() as cur:
            # 1. Enable the Vector Extension (The AI Plugin)
            print("🔌 Enabling pgvector extension...")
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            
            # 2. Add the 'embedding' column to your logs table
            # 384 is the specific size for the 'all-MiniLM-L6-v2' model
            print("🗄️ Adding embedding column...")
            cur.execute("""
                ALTER TABLE agent_logs 
                ADD COLUMN IF NOT EXISTS embedding vector(384);
            """)
            
            conn.commit()
            print("✅ AI Brain Structure Ready!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    setup_vector_db()