# ingestion/config.py
import os

# Performance Tunables
BATCH_SIZE = 2000          # Reduced to make batches smaller/lighter
NUM_WORKERS = os.cpu_count() or 4
QUEUE_MAX_SIZE = 100

# Database Config
DB_URI = "postgresql://admin:password@localhost:5432/agentops"
DB_BATCH_SIZE = 5000       # Flush to DB more often

# Benchmark Settings
TOTAL_LOGS_TO_PROCESS = 20_000  # <--- CHANGED: Much smaller for testing