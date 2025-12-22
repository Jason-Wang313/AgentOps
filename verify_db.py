# verify_db.py
import psycopg

DB_URI = "postgresql://admin:password@localhost:5432/agentops"

def check_data():
    try:
        with psycopg.connect(DB_URI) as conn:
            with conn.cursor() as cur:
                # 1. Count Total Rows
                cur.execute("SELECT COUNT(*) FROM agent_logs;")
                count = cur.fetchone()[0]
                
                # 2. Check a sample row
                cur.execute("SELECT * FROM agent_logs LIMIT 1;")
                sample = cur.fetchone()
                
        print(f"📊 Live Row Count: {count:,}")
        print(f"🔎 Sample Data: {sample}")
        
        if count >= 200_000:
            print("✅ SUCCESS: Data Integrity Confirmed.")
        else:
            print(f"⚠️ WARNING: Expected 200,000 rows, found {count}. (Did you run the benchmark?)")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    check_data()