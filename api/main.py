from database.db import init_db
from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from contextlib import asynccontextmanager
from psycopg_pool import ConnectionPool 
from psycopg.rows import dict_row
from typing import Optional, List, Dict, Any
import json
import os 
import time
import random
from datetime import datetime, timedelta

# --- Import AI Library ---
from sentence_transformers import SentenceTransformer

# --- Configuration ---
API_KEY_NAME = "X-API-Key"
VALID_API_KEYS = {"sk-agentops-secret-123", "sk-yc-demo-456"}

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

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
            
            # --- THE FIX: Pad 384 up to 1536 ---
            # This allows the free model to work with the OpenAI-sized database column
            current_len = len(raw_vector)
            target_len = 1536
            
            if current_len < target_len:
                # Add zeros to the end to match database schema
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
    """Fetches the last 20 logs safely."""
    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT ts, payload 
                    FROM agent_logs 
                    ORDER BY ts DESC 
                    LIMIT 20
                """)
                rows = cur.fetchall()
                
                data = []
                for row in reversed(rows):
                    payload = row['payload']
                    # Handle stringified JSON if needed
                    if isinstance(payload, str):
                        payload = json.loads(payload)
                    
                    latency = payload.get("latency", 0) if isinstance(payload, dict) else 0
                    
                    data.append({
                        "time": row['ts'].strftime("%H:%M:%S"),
                        "latency": latency
                    })
                
                return {"history": data}
            
    except Exception as e:
        print(f"Stats Error: {e}")
        # Return empty list instead of 500ing
        return {"history": []}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port)