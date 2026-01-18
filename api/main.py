from database.db import init_db
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from psycopg_pool import ConnectionPool 
from psycopg.rows import dict_row
from typing import Dict, Any, List
import json
import os 
from datetime import datetime

# --- Import AI Library ---
from sentence_transformers import SentenceTransformer

# --- Global Variables ---
model = None
# Use the Render Internal URL from env, or fallback to local
DB_URI = os.getenv("SUPABASE_URL", "postgresql://admin:password@localhost:5432/agentops")

# Initialize pool (Wait to open it until startup)
pool = ConnectionPool(DB_URI, min_size=1, max_size=10, kwargs={"row_factory": dict_row}, open=False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 API Starting...")
    
    # 1. Initialize DB Tables
    print("🤖 Startup: Checking Database...")
    try:
        init_db()
    except Exception as e:
        print(f"⚠️ Init Warning: {e}")

    # 2. Load AI Model
    global model
    print("🧠 Loading AI Model...")
    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ AI Model Loaded!")
    except Exception as e:
        print(f"⚠️ AI Model Failed (running without vector search): {e}")

    # 3. Open DB Pool
    pool.open()
    yield
    pool.close()
    print("🛑 API Shutting down...")

app = FastAPI(title="AgentOps API", lifespan=lifespan)

# --- PUBLIC CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Allow ALL origins
    allow_credentials=False,  # Disable cookies/auth headers for public access
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Models ---
class AgentLog(BaseModel):
    agent_id: str
    level: str
    action: str
    payload: Dict[str, Any]

# --- Endpoints ---

@app.get("/")
def health_check():
    return {"status": "online", "message": "AgentOps is ready."}

@app.post("/ingest")
def ingest_log(log: AgentLog):
    """Receives a log from an agent and saves it."""
    try:
        # 1. Generate the raw vector (Size: 384)
        vector = [0.0] * 1536 # Default fallback
        if model:
            raw_vector = model.encode(log.action).tolist()
            
            # Pad 384 up to 1536 to match OpenAI schema
            current_len = len(raw_vector)
            target_len = 1536
            
            if current_len < target_len:
                vector = raw_vector + [0.0] * (target_len - current_len)
            else:
                vector = raw_vector[:target_len] 

        # 2. Insert into Database
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO agent_logs (ts, agent_id, level, action, payload, embedding)
                    VALUES (NOW(), %s, %s, %s, %s, %s)
                """, (log.agent_id, log.level, log.action, json.dumps(log.payload), vector))
                conn.commit()
                
        return {"status": "logged"}
        
    except Exception as e:
        print(f"Ingest Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
def get_stats():
    """Fetches the last 100 logs for the dashboard."""
    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                # Select data (ts is index 0, payload is index 1)
                cur.execute("""
                    SELECT ts, payload 
                    FROM agent_logs 
                    ORDER BY ts DESC 
                    LIMIT 100
                """)
                
                rows = cur.fetchall()
                
                data = []
                # --- INDENTATION FIX IS HERE ---
                for row in reversed(rows):
                    # Hybrid Safety Check: Handle Tuple vs Dict
                    if isinstance(row, dict):
                        ts = row['ts']
                        payload = row['payload']
                    else:
                        ts = row[0] 
                        payload = row[1]
                    
                    # Ensure Payload is a Dict
                    if isinstance(payload, str):
                        try:
                            payload = json.loads(payload)
                        except:
                            payload = {}
                    
                    # Extract Latency safely
                    latency = 0
                    if isinstance(payload, dict):
                        latency = payload.get("latency", 0)
                    
                    data.append({
                        "time": ts.strftime("%H:%M:%S"),
                        "latency": latency
                    })
                
                return {"history": data}
            
    except Exception as e:
        print(f"Stats Error: {e}")
        # Return empty list instead of crashing (500)
        return {"history": []}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port)