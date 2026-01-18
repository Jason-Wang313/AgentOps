import requests
import time
import math
import random

# Targeted at the AgentOps Render deployment
API_URL = "https://agentops-e0zs.onrender.com" 
counter = 0

print("🚀 AgentOps High-Throughput Seed Started")
print("📡 Targeting: Eventual / TraceRoot Scale Metrics")

while True:
    # 1. HARMONIC OSCILLATION (The "Liquid" Physics)
    # Combining two waves creates the complex "swell and ripple" effect
    slow_wave = math.sin(counter / 15.0) * 40 # The base swell
    fast_wave = math.sin(counter / 7.0) * 15  # The surface ripple
    
    # 2. MICRO-JITTER (The "Real-World" Texture)
    # Adds subtle noise so it doesn't look like a perfect math function
    jitter = random.uniform(-2, 2)
    
    # Base latency (80ms) + Harmonic Waves + Jitter
    latency = int(80 + slow_wave + fast_wave + jitter)
    
    # 3. DATA SCHEMA (The "Wide Event")
    data = {
        "agent_id": "Agent-Wave-X",
        "level": "INFO",
        "action": "harmonic_compute",
        "payload": { 
            "latency": latency,
            "timestamp": time.time(), # Added for X-axis precision
            "step": counter
        }
    }
    
    try:
        # Pushing at ~25 FPS to ensure the frontend chart buffer stays full
        # Using a short timeout to prevent the seed from hanging on network lag
        requests.post(f"{API_URL}/ingest", json=data, timeout=0.1)
        
        # Terminal visualizer
        print(f"🌊 Liquid Wave: {latency}ms | FPS: ~25", end="\r")
        
    except Exception as e:
        # Week 4: Safety Net - Silent failures prevent process crashes
        pass
        
    counter += 1
    
    # 4. TUNING THE "FPS"
    # 0.08s was 12 FPS. 0.04s is 25 FPS (The standard for smooth animation).
    time.sleep(0.04)