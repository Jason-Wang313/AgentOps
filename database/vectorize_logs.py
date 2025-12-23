from sentence_transformers import SentenceTransformer
from db import get_db_connection
import json

# 1. Load the Free Local AI Model
print("📥 Loading AI Model (this happens once)...")
model = SentenceTransformer('all-MiniLM-L6-v2')

def vectorize_missing():
    conn = get_db_connection()
    if not conn:
        return

    try:
        with conn.cursor() as cur:
            # 2. Find logs that don't have embeddings yet
            cur.execute("SELECT id, agent_id, action, level, payload FROM agent_logs WHERE embedding IS NULL")
            rows = cur.fetchall()
            
            print(f"🧠 Found {len(rows)} logs to process...")

            for row in rows:
                log_id = row[0]
                # Construct the "sentence" describing the event
                # We combine Agent Name + Action + Status + Latency
                payload_str = str(row[4])
                description = f"Agent {row[1]} did {row[2]} with status {row[3]}. Details: {payload_str}"
                
                # 3. Generate the Vector (The Magic)
                embedding = model.encode(description)
                
                # 4. Save back to database
                cur.execute(
                    "UPDATE agent_logs SET embedding = %s WHERE id = %s",
                    (embedding.tolist(), log_id)
                )
                print(f"   -> Learned: {row[1]} ({row[2]})")
            
            conn.commit()
            print("✅ All logs vectorized!")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    vectorize_missing()