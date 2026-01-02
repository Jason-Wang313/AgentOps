import requests
import time
import math

# YOUR LIVE URL
API_URL = "https://agentops-e0zs.onrender.com" 

print(f"🌊 Sending SMOOTH WAVE data to {API_URL}...")
print("Press CTRL+C to stop.")

counter = 0

while True:
    # Use math.sin to generate a smooth wave between 0 and 1
    # Dividing counter by 10 makes the wave move slower/smoother
    wave_value = math.sin(counter / 5.0) 
    
    # Scale it: Map the -1 to 1 sine wave to a 40ms to 120ms latency range
    latency = int(80 + (wave_value * 40)) 
    
    data = {
        "agent_id": "Agent-Wave",
        "level": "INFO",
        "action": "smooth_processing",
        "payload": {
            "latency": latency
        }
    }
    
    try:
        requests.post(f"{API_URL}/ingest", json=data)
        
        # Visual loading bar in terminal
        bar = "█" * int((latency - 40) / 4)
        print(f"🌊 Latency: {latency}ms | {bar}", end="\r")
        
    except Exception as e:
        pass
        
    counter += 1
    # Faster updates = Smoother visual movement (0.5s)
    time.sleep(1.0)