import os
import psycopg
import time
import sys

# 1. Verification Print
print("🚀 Script starting...")

# CRITICAL CHANGE: 
# This tells Python: "Look for the secret variable SUPABASE_URL first."
# If it can't find it (like on your laptop), it defaults to localhost.
DB_URI = os.getenv("SUPABASE_URL", "postgresql://admin:password@localhost:5432/agentops")

def get_connection():
    return psycopg.connect(DB_URI)

def bulk_insert_logs(rows):
    if not rows:
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            with cur.copy("COPY agent_logs (ts, agent_id, level, action, payload, embedding) FROM STDIN") as copy:
                for row in rows:
                    copy.write_row(row)
            conn.commit()

def init_db():
    print(f"⏳ Attempting to connect to Database...")

    # SAFETY CHECK: Only drop tables if we are NOT in production
    if "supa" in DB_URI:
        print("🌍 Detected Cloud Database. Skipping DROP TABLE to protect data.")
        drop_sql = "-- Skipping DROP TABLE in production"
    else:
        drop_sql = "DROP TABLE IF EXISTS agent_logs CASCADE;"

    schema_sql = f"""
    CREATE EXTENSION IF NOT EXISTS vector;
    {drop_sql}
    CREATE TABLE IF NOT EXISTS agent_logs (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        ts TIMESTAMP WITH TIME ZONE NOT NULL,
        agent_id TEXT NOT NULL,
        level TEXT NOT NULL,
        action TEXT NOT NULL,
        payload JSONB NOT NULL,
        embedding vector(1536)
    );
    """
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(schema_sql)
                    conn.commit()
            print("✅ SUCCESS: Database initialized.")
            return
        except Exception as e:
            print(f"⚠️ Connection failed (Attempt {attempt+1}/{max_retries}): {e}")
            time.sleep(2)
    
    print("❌ CRITICAL ERROR: Could not connect to Database.")
    sys.exit(1)

if __name__ == "__main__":
    init_db()

get_db_connection = get_connection