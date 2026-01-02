import requests
import random
import time

# YOUR LIVE URL
API_URL = "https://agentops-e0zs.onrender.com" 

agents = ["Agent-Alpha", "Agent-Beta", "AutoGPT-1"]
actions = ["reasoning", "tool_use", "memory_retrieval"]

print(f"🚀 Sending fake data to {API_URL}...")

for i in range(20):
    data = {
        "agent_id": random.choice(agents),
        "level": "INFO",
        "action": random.choice(actions),
        "payload": {
            "latency": random.randint(20, 150), # Random latency for the chart
            "tokens": random.randint(100, 500)
        }
    }
    
    try:
        res = requests.post(f"{API_URL}/ingest", json=data)
        if res.status_code == 200:
            print(f"✅ Logged event {i+1}/20")
        else:
            print(f"❌ Error: {res.text}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        
    time.sleep(0.5) # Fast updates

print("✨ Done! Check your dashboard.")