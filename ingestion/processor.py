# ingestion/processor.py
import multiprocessing
import ujson as json
import psycopg
import time
from .config import NUM_WORKERS, QUEUE_MAX_SIZE, DB_URI, DB_BATCH_SIZE

def _worker_process(queue, worker_id):
    processed_count = 0
    buffer = []
    
    try:
        with psycopg.connect(DB_URI) as conn:
            with conn.cursor() as cur:
                print(f"Worker {worker_id}: Connected to DB")
                
                while True:
                    batch = queue.get()
                    if batch is None:
                        # Flush leftovers before quitting
                        if buffer: 
                            _flush_buffer(cur, buffer)
                            conn.commit()
                            processed_count += len(buffer)
                        break
                    
                    for log_str in batch:
                        try:
                            data = json.loads(log_str)
                            
                            row = (
                                time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(data['ts'])),
                                data['agent_id'],
                                data['level'],
                                data['action'],
                                json.dumps(data['payload']),
                                str(data['embedding'])  # Back to REAL data
                            )
                            buffer.append(row)
                        except Exception as parse_error:
                            print(f"⚠️ Worker {worker_id} skipped bad log: {parse_error}")
                    
                    # Flush if buffer is full
                    if len(buffer) >= DB_BATCH_SIZE:
                        _flush_buffer(cur, buffer)
                        conn.commit()
                        processed_count += len(buffer)
                        buffer.clear()
                        
    except Exception as e:
        print(f"❌ Worker {worker_id} CRASHED: {e}")
    finally:
        print(f"Worker {worker_id} finished. Rows written: {processed_count}")

def _flush_buffer(cur, buffer):
    if not buffer: return
    try:
        # High-Performance COPY Command
        with cur.copy("COPY agent_logs (ts, agent_id, level, action, payload, embedding) FROM STDIN") as copy:
            for row in buffer:
                copy.write_row(row)
    except Exception as e:
        print(f"⚠️ Write Error: {e}")

class IngestionEngine:
    def __init__(self):
        self.queue = multiprocessing.Queue(maxsize=QUEUE_MAX_SIZE)
        self.workers = []

    def start(self):
        print(f"🔥 Starting engine with {NUM_WORKERS} workers...")
        for i in range(NUM_WORKERS):
            p = multiprocessing.Process(target=_worker_process, args=(self.queue, i))
            p.start()
            self.workers.append(p)

    def ingest_batch(self, batch):
        self.queue.put(batch)

    def stop(self):
        for _ in range(NUM_WORKERS):
            self.queue.put(None)
        for p in self.workers:
            p.join()