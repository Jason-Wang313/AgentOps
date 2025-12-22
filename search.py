# search.py
import psycopg
import random
import time

DB_URI = "postgresql://admin:password@localhost:5432/agentops"

def run_hybrid_search():
    # 1. Generate a random query vector (Simulating: "Why did the agent fail?")
    query_vector = str([random.random() for _ in range(1536)])
    
    target_agent = "agent_5"

    query = """
    SELECT id, agent_id, payload, 
           1 - (embedding <=> %s) as similarity
    FROM agent_logs
    WHERE agent_id = %s  -- SQL Filter (Keyword)
    ORDER BY embedding <=> %s LIMIT 5; -- Vector Sort (Semantic)
    """
    
    print(f"🔎 Searching for similar logs for {target_agent}...")
    start = time.time()
    
    with psycopg.connect(DB_URI) as conn:
        with conn.cursor() as cur:
            # We pass the vector twice: once for calculation, once for sorting
            cur.execute(query, (query_vector, target_agent, query_vector))
            results = cur.fetchall()
            
    duration = time.time() - start
    
    print(f"✅ Found {len(results)} results in {duration:.4f}s")
    for row in results:
        print(f"   [Score: {row[3]:.4f}] ID: {row[0]} | Payload: {row[2]}")

if __name__ == "__main__":
    run_hybrid_search()