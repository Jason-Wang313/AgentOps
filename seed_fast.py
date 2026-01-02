import requests
import time
import math
import random

API_URL = "https://agentops-e0zs.onrender.com" 

print(f"🚀 High-Speed Wave Generator Connected to {API_URL}")
print("🌊 Generating smooth liquid data...")

counter = 0

while True:
    # 1. Create a "Double Wave" for complex liquid movement
    wave1 = math.sin(counter / 10.0) 
    wave2 = math.sin(counter / 5.0) * 0.5
    combined = (wave1 + wave2) # Range approx -1.5 to 1.5
    
    # 2. Map to Latency (40ms to 120ms)
    latency = int(80 + (combined * 30))
    
    # Add tiny random jitter for realism
    latency += random.randint(-2, 2)
    
    data = {
        "agent_id": "Agent-Wave-Fast",
        "level": "INFO",
        "action": "high_freq_compute",
        "payload": { "latency": latency }
    }
    
    try:
        # Use a short timeout so we don't get stuck if network lags
        requests.post(f"{API_URL}/ingest", json=data, timeout=0.5)
        
        # Visualizer
        bar = "▓" * int((latency - 30) / 4)
        print(f"⚡ {latency}ms {bar}", end="\r")
    except:
        pass
        
    counter += 1
    # ⚡ 10 FPS SPEED (0.1s)
    time.sleep(0.1)