# ingestion/generator.py
import time
import ujson as json  # Keep using ujson for speed
import random
from typing import List

def generate_log_batch(batch_size: int) -> List[str]:
    batch = []
    base_timestamp = time.time()
    
    for i in range(batch_size):
        # Create a Fake Vector: 1536 dimensions (Standard OpenAI size)
        # We round to 2 decimals to save string processing time during the benchmark
        fake_vector = [round(random.random(), 2) for _ in range(1536)]
        
        log = {
            "ts": base_timestamp + i,
            "level": "INFO",
            "agent_id": f"agent_{random.randint(1, 50)}",
            "action": "reasoning_step",
            "payload": {
                "tokens": random.randint(10, 100),
                "model": "gpt-4-turbo"
            },
            "embedding": fake_vector # <--- NEW FIELD
        }
        batch.append(json.dumps(log))
    
    return batch