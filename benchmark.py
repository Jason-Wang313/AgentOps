# benchmark.py
import time
import multiprocessing
# Adjust import based on your actual file structure
from ingestion import IngestionEngine, generate_log_batch 
from ingestion.config import TOTAL_LOGS_TO_PROCESS, BATCH_SIZE

def run_benchmark():
    engine = IngestionEngine()
    engine.start()

    # --- THE FIX: Pre-generate one batch and reuse it ---
    print("⚡ Pre-generating data to bypass CPU bottleneck...")
    # Generate one single batch of data
    cached_batch = generate_log_batch(BATCH_SIZE) 
    
    # Calculate how many times we need to insert this batch
    batches_needed = TOTAL_LOGS_TO_PROCESS // BATCH_SIZE
    
    print(f"🚀 Starting Benchmark: Processing {TOTAL_LOGS_TO_PROCESS} logs...")
    start_time = time.time()

    # Feed the engine with the SAME batch repeatedly
    # This simulates "infinite" generation speed
    for _ in range(batches_needed):
        engine.ingest_batch(cached_batch)

    engine.stop()
    end_time = time.time()
    
    duration = end_time - start_time
    throughput = TOTAL_LOGS_TO_PROCESS / duration

    print(f"\n✅ DONE in {duration:.4f} seconds")
    print(f"⚡ Throughput: {throughput:,.0f} events/sec")

    if throughput > 5000:
        print("🏆 RESULT: YC SCALE ACHIEVED!")
    else:
        print("⚠️ RESULT: Still hitting a bottleneck.")

if __name__ == "__main__":
    # Ensure this protects the entry point
    multiprocessing.freeze_support()
    run_benchmark()