import time
import random
import json
from datetime import datetime
from db import get_db_connection

# 🤖 The Cast of Characters
AGENTS = ["Agent_Alpha", "Billing_Bot", "Support_AI", "Coder_X", "Data_Miner"]
ACTIONS = ["summarize_text", "calculate_tax", "generate_image", "scrape_web", "translate"]
STATUSES = ["success", "success", "success", "warning", "error"] # Mostly success, occasional chaos

def generate_chaos():
    conn = get_db_connection()
    if not conn:
        return

    print("🐒 Chaos Monkey is running! (Press Ctrl+C to stop)")
    
    try:
        with conn.cursor() as cur:
            while True:
                # 1. Pick a random agent and mission
                agent = random.choice(AGENTS)
                action = random.choice(ACTIONS)
                status = random.choice(STATUSES)
                
                # 2. Simulate Latency (Errors take longer!)
                if status == "error":
                    latency = random.randint(800, 2000) # Huge spike
                    level = "ERROR"
                elif status == "warning":
                    latency = random.randint(300, 700)  # Moderate lag
                    level = "WARN"
                else:
                    latency = random.randint(20, 150)   # Fast & smooth
                    level = "INFO"

                # 3. Create the Payload (The secret data)
                payload = json.dumps({
                    "latency": latency,
                    "status": status,
                    "cpu_usage": random.randint(10, 90),
                    "memory": f"{random.randint(100, 500)}MB"
                })

                # 4. Insert into Database
                cur.execute("""
                    INSERT INTO agent_logs (agent_id, ts, payload, level, action)
                    VALUES (%s, %s, %s, %s, %s)
                """, (agent, datetime.now(), payload, level, action))
                
                conn.commit()
                print(f"🚀 {agent} | {action} | {latency}ms | {status.upper()}")
                
                # 5. Sleep briefly (0.5 to 2 seconds) to create a rhythm
                time.sleep(random.uniform(0.5, 2.0))

    except KeyboardInterrupt:
        print("\n🛑 Chaos Monkey stopped.")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    generate_chaos()