import psycopg2
import datetime
import json
import random
import uuid
from sentence_transformers import SentenceTransformer

# 1. Configuration & Credentials
DB_HOST = "aws-1-eu-central-1.pooler.supabase.com"
DB_PORT = "5432"
DB_NAME = "postgres"
DB_USER = "postgres.ecdxsyjcdrdtgqtazngb"
DB_PASS = "ClA9o9BV48QhKNQl"

# Construct the Connection String (DSN)
DB_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print(f"🔌 Connecting to: {DB_HOST} on port {DB_PORT}...")

# 2. Initialize the Embedding Model
# 'all-MiniLM-L6-v2' outputs 384-dimensional vectors
print("🧠 Loading SentenceTransformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_dummy_data():
    """Generates a list of dummy log entries."""
    actions = ["user_login", "file_upload", "data_process", "error_log", "logout"]
    templates = [
        "User {uid} logged in from {ip}.",
        "Uploaded file {file} with size {size}KB.",
        "Processed batch {batch_id} successfully.",
        "Error encountered in module {mod}: {err}",
        "User {uid} ended session."
    ]
    
    logs = []
    for _ in range(20):
        action = random.choice(actions)
        payload = {
            "user_id": str(uuid.uuid4())[:8],
            "ip": f"192.168.1.{random.randint(1, 255)}",
            "metadata": "dummy_data"
        }
        
        # Create a text representation for embedding
        text_content = random.choice(templates).format(
            uid=payload['user_id'],
            ip=payload['ip'],
            file="report.pdf",
            size=random.randint(100, 5000),
            batch_id=random.randint(1000, 9999),
            mod="auth_service",
            err="timeout"
        )
        
        logs.append({
            "agent_id": f"agent_{random.randint(1, 5)}",
            "action": action,
            "payload": json.dumps(payload),
            "text_content": text_content,
            "ts": datetime.datetime.now().isoformat()
        })
    return logs

def run_seed():
    conn = None
    try:
        # Connect to the database
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        print("✅ Connection established.")

        # 3. Enable pgvector extension
        # Crucial: The 'vector' type won't exist without this extension.
        print("⚙️  Checking extensions...")
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        
        # 4. Create the Table
        print("🔨 Creating table 'agent_logs' if not exists...")
        create_table_query = """
        CREATE TABLE IF NOT EXISTS agent_logs (
            id SERIAL PRIMARY KEY,
            agent_id TEXT NOT NULL,
            action TEXT NOT NULL,
            payload JSONB,
            ts TIMESTAMP,
            embedding vector(384)
        );
        """
        cur.execute(create_table_query)
        conn.commit()

        # 5. Generate and Insert Data
        logs = get_dummy_data()
        print(f"🚀 Seeding {len(logs)} records...")

        for log in logs:
            # Generate vector embedding for the log content
            vector = model.encode(log['text_content']).tolist()
            
            insert_query = """
            INSERT INTO agent_logs (agent_id, action, payload, ts, embedding)
            VALUES (%s, %s, %s, %s, %s)
            """
            
            # Note: psycopg2 handles the list->vector conversion automatically 
            # if the extension is loaded, but explicit casting is safer.
            cur.execute(insert_query, (
                log['agent_id'],
                log['action'],
                log['payload'],
                log['ts'],
                vector
            ))
        
        conn.commit()
        print("✨ Success! 20 logs inserted with embeddings.")

    except psycopg2.OperationalError as e:
        print(f"❌ Network/Connection Error: {e}")
        print("Tip: Ensure you are using the 'Session' connection pooler (Port 5432) for IPv4 support.")
    except Exception as e:
        print(f"❌ An error occurred: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()
            print("🔒 Connection closed.")

if __name__ == "__main__":
    run_seed()