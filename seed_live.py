import requests
import random
import time

# YOUR LIVE URL
API_URL = "https://agentops-e0zs.onrender.com" 

print(f"🚀 Live Stream Started: Sending data to {API_URL}...")
print("Press CTRL+C to stop.")

counter = 0

# --- INFINITE LOOP ---
while True:
    counter += 1
    data = {
        "agent_id": "Agent-Live",
        "level": "INFO",
        "action": "real_time_reasoning",
        "payload": {
            # Random latency between 20ms and 150ms to make the chart jumpy
            "latency": random.randint(20, 150) 
        }
    }
    
    try:
        requests.post(f"{API_URL}/ingest", json=data)
        print(f"⚡ Sent event #{counter}", end="\r") # Updates on the same line
    except:
        pass
        
    time.sleep(1.0) # Matches your chart speed (1 second)