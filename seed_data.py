import psycopg2
import random
from datetime import datetime, timedelta

# 1. CREDENTIALS (Taken directly from your db.py screenshot)
DB_CONFIG = {
    "dbname": "agentops",   # Found in db.py
    "user": "admin",        # Found in db.py
    "password": "password", # Found in db.py
    "host": "localhost",
    "port": "5432"
}

try:
    # Connect to the database
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    print("🔌 Connected to database 'agentops' successfully!")

    # 2. CREATE TABLE (If it doesn't exist)
    # Since db.py only creates 'agent_logs', we must manually create 'latency_logs' 
    # so the chart has something to read.
    create_table_query = """
    CREATE TABLE IF NOT EXISTS latency_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        latency_ms INTEGER NOT NULL
    );
    """
    cur.execute(create_table_query)
    print("🛠️  Table 'latency_logs' checked/created.")

    # 3. SEED DATA
    insert_query = """
    INSERT INTO latency_logs (timestamp, latency_ms)
    VALUES (%s, %s)
    """
    
    print("🌱 Seeding data...")
    # Generate 20 data points for the last 20 minutes
    for i in range(20):
        t = datetime.now() - timedelta(minutes=20-i)
        latency = random.randint(50, 300)
        cur.execute(insert_query, (t, latency))
    
    conn.commit()
    print("✅ SUCCESS! Added 20 records. The chart will now work.")
    
    cur.close()
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    if "does not exist" in str(e):
        print("💡 Hint: Did you create the 'agentops' database yet?")