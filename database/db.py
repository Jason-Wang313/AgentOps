# database/db.py
import psycopg
import time
import sys

# 1. Verification Print (If you don't see this, the file isn't running)
print("🚀 Script starting...")

# Connection String
DB_URI = "postgresql://admin:password@localhost:5432/agentops"

def get_connection():
    return psycopg.connect(DB_URI)

# database/db.py (Add this function)

def bulk_insert_logs(rows):
    """
    Uses PostgreSQL COPY protocol for maximum throughput.
    'rows' should be a list of tuples: (ts, agent_id, level, action, payload, embedding)
    """
    if not rows:
        return

    with get_connection() as conn:
        with conn.cursor() as cur:
            # "COPY" is roughly 10-50x faster than "INSERT"
            with cur.copy("COPY agent_logs (ts, agent_id, level, action, payload, embedding) FROM STDIN") as copy:
                for row in rows:
                    copy.write_row(row)
            conn.commit()

def init_db():
    print("⏳ Attempting to connect to Docker container...")
    
   # database/db.py
    
    # ... (imports and connection logic remain the same) ...

  

    schema_sql = """
    CREATE EXTENSION IF NOT EXISTS vector;
    DROP TABLE IF EXISTS agent_logs CASCADE;
    CREATE TABLE agent_logs (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        ts TIMESTAMP WITH TIME ZONE NOT NULL,
        agent_id TEXT NOT NULL,
        level TEXT NOT NULL,
        action TEXT NOT NULL,
        payload JSONB NOT NULL,
        embedding vector(1536)
    );

    -- CREATE INDEX idx_agent_id ON agent_logs(agent_id);  <--- COMMENT THIS OUT
    """
    
    # ... (rest of the file remains the same) ...
    
    # Retry Logic (Wait for Docker to wake up)
    max_retries = 5
    for attempt in range(max_retries):
        try:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(schema_sql)
                    conn.commit()
            print("✅ SUCCESS: Database initialized and Table created.")
            return
        except Exception as e:
            print(f"⚠️ Connection failed (Attempt {attempt+1}/{max_retries}): {e}")
            time.sleep(2)
    
    print("❌ CRITICAL ERROR: Could not connect to Docker.")
    sys.exit(1)

# This is the part you were missing!
if __name__ == "__main__":
    init_db()