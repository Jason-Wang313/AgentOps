from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from contextlib import asynccontextmanager
from psycopg_pool import ConnectionPool 
from psycopg.rows import dict_row
from typing import Optional
import json
import time
import random
import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from datetime import datetime, timedelta

# --- NEW: Import AI Library ---
from sentence_transformers import SentenceTransformer

# --- Import Database Connection ---
from database.db import get_connection

# --- Configuration ---
DB_URI = "postgresql://admin:password@localhost:5432/agentops"
REDIS_URL = "redis://localhost:6379"
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
    
    # 3. Connect to Redis
    try:
        redis_connection = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(redis_connection)
        print("✅ Redis Rate Limiter Initialized")
    except Exception as e:
        print(f"❌ Redis Failed: {e}")
    
    yield
    
    print("🛑 API Shutting down...")
    pool.close()
    await redis_connection.aclose()

app = FastAPI(title="AgentOps API", lifespan=lifespan)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
    1. Converts your text -> Numbers (Vector)
    2. Asks Database -> 'Find vectors closest to this one'
    3. Returns ID so we can resolve/delete it
    """
    conn = get_connection()
    if not conn:
        return {"results": []}
    
    try:
        # 1. Convert user query to vector
        query_embedding = model.encode(search.query).tolist()
        
        with conn.cursor() as cur:
            # 2. SQL Vector Search using Cosine Distance (<=>)
            # NOTE: We added 'id' to the SELECT list (row index 3)
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
                    "id": row[3],      # <--- We need this for the DELETE button
                    "score": row[4]    # <--- Similarity score is now index 4
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
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)