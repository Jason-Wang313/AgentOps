from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from contextlib import asynccontextmanager
from psycopg_pool import ConnectionPool 
from psycopg.rows import dict_row
from typing import Optional
import json
import os # Added OS to read environment variables
import time
import random
from datetime import datetime, timedelta

# --- NEW: Import AI Library ---
from sentence_transformers import SentenceTransformer

# --- Import Database Connection ---
from database.db import get_connection

# --- Configuration ---
# WE REMOVED REDIS_URL to prevent crashes
API_KEY_NAME = "X-API-Key"
VALID_API_KEYS = {"sk-agentops-secret-123", "sk-yc-demo-456"}

# --- Global AI Model Variable ---
model = None

# --- Security Setup ---
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header in VALID_API_KEYS:
        return api_key_header
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials. Please provide a valid X-API-Key header."
    )

# --- Connection Pool ---
# NOTE: We use os.getenv to ensure we use the Render Environment Variable if available
DB_URI = os.getenv("SUPABASE_URL", "postgresql://admin:password@localhost:5432/agentops")
pool = ConnectionPool(DB_URI, min_size=1, max_size=10, kwargs={"row_factory": dict_row}, open=False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print("🚀 API Starting...")
    
    # 1. Load AI Model
    print("🧠 Loading AI Model... (this might take a moment)")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("✅ AI Model Loaded!")

    # 2. Open DB Pool
    pool.open()
    
    # REMOVED: Redis connection block
    
    yield
    
    print("🛑 API Shutting down...")
    pool.close()
    # REMOVED: Redis close

app = FastAPI(title="AgentOps API", lifespan=lifespan)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Changed to "*" to allow Render frontend to hit it easily
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "online", "message": "AgentOps is ready."}

# --- Stats Endpoint ---
@app.get("/stats")
def get_stats():
    """Fetches the last 20 logs and extracts latency from the JSON payload."""
    conn = get_connection()
    if not conn:
        return {"history": []}
    
    try:
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
                ts = row[0]
                payload_raw = row[1]
                
                if isinstance(payload_raw, str):
                    try:
                        payload = json.loads(payload_raw)
                    except ValueError:
                        payload = {}
                else:
                    payload = payload_raw or {}
                
                if isinstance(payload, dict):
                    latency = payload.get("latency", 0)
                else:
                    latency = 0
                
                data.append({
                    "time": ts.strftime("%H:%M:%S"),
                    "latency": latency
                })
                
            return {"history": data}
            
    except Exception as e:
        print(f"Stats Error: {e}")
        return {"history": []}
    finally:
        conn.close()

# --- Vector Search Endpoint ---

class SearchQuery(BaseModel):
    query: str

@app.post("/search")
def search_traces(search: SearchQuery):
    """
    The Magic AI Search:
    """
    conn = get_connection()
    if not conn:
        return {"results": []}
    
    try:
        # 1. Convert user query to vector
        query_embedding = model.encode(search.query).tolist()
        
        with conn.cursor() as cur:
            # 2. SQL Vector Search using Cosine Distance (<=>)
            cur.execute("""
                SELECT agent_id, payload, ts, id,
                       1 - (embedding <=> %s::vector) as similarity
                FROM agent_logs
                ORDER BY similarity DESC
                LIMIT 5
            """, (query_embedding,))
            
            rows = cur.fetchall()
            results = []
            for row in rows:
                payload = row[1]
                if isinstance(payload, str):
                    try:
                        payload = json.loads(payload)
                    except ValueError:
                        payload = {}
                
                # Extract latency safely
                latency = 0
                if isinstance(payload, dict):
                    latency = payload.get("latency", 0)

                results.append({
                    "agent_id": row[0],
                    "latency": latency,
                    "time": row[2].strftime("%H:%M"),
                    "payload": payload,
                    "id": row[3],
                    "score": row[4]
                })
            
            return {"results": results}
    except Exception as e:
        print(f"Search Error: {e}")
        return {"results": []}
    finally:
        conn.close()

# --- Delete Endpoint ---
@app.delete("/traces/{log_id}")
def delete_trace(log_id: int):
    """Deletes a specific log entry by ID."""
    conn = get_connection()
    if not conn:
        return {"status": "failed"}
    
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM agent_logs WHERE id = %s", (log_id,))
            conn.commit()
            return {"status": "success", "deleted_id": log_id}
    except Exception as e:
        print(f"Delete Error: {e}")
        return {"status": "error"}
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    # IMPORTANT: Use environment variable for PORT!
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=False)