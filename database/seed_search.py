import json
from datetime import datetime
from db import get_db_connection

conn = get_db_connection()
if conn:
    try:
        with conn.cursor() as cur:
            # Prepare the data
            secret_agent = "Bond_007"
            # We hide the latency inside the 'payload' JSON box
            data_payload = json.dumps({"latency": 150, "mission": "top_secret"})
            current_time = datetime.now()

            # Insert using the CORRECT column names: agent_id, ts, payload
            cur.execute("""
                INSERT INTO agent_logs (agent_id, ts, payload, level, action)
                VALUES (%s, %s, %s, %s, %s)
            """, (secret_agent, current_time, data_payload, "INFO", "search_test"))
            
            conn.commit()
            print(f"✅ Secret Agent '{secret_agent}' inserted successfully!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()