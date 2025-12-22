# api/main.py
from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.security.api_key import APIKeyHeader
from pydantic import BaseModel
from contextlib import asynccontextmanager
from psycopg_pool import ConnectionPool 
from psycopg.rows import dict_row
from typing import Optional
import ujson as json
import time
import random
import redis.asyncio as redis
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

# --- Configuration ---
DB_URI = "postgresql://admin:password@localhost:5432/agentops"
REDIS_URL = "redis://localhost:6379"
API_KEY_NAME = "X-API-Key"
VALID_API_KEYS = {"sk-agentops-secret-123", "sk-yc-demo-456"}

# --- Security Setup ---
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header in VALID_API_KEYS:
        return api_key_header
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials. Please provide a valid X-API-Key header."
    )

# --- FIXED: Explicitly set open=False to silence warning ---
pool = ConnectionPool(DB_URI, min_size=1, max_size=10, kwargs={"row_factory": dict_row}, open=False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 API Starting...")
    pool.open() # Manually open pool
    try:
        redis_connection = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        await FastAPILimiter.init(redis_connection)
        print("✅ Redis Rate Limiter Initialized")
    except Exception as e:
        print(f"❌ Redis Failed: {e}")
    
    yield
    
    print("🛑 API Shutting down...")
    pool.close()
    # --- FIXED: Use aclose() to silence warning ---
    await redis_connection.aclose()

app = FastAPI(title="AgentOps API", lifespan=lifespan)

# --- Data Models ---
class SearchQuery(BaseModel):
    query: str
    limit: int = 5
    agent_id: Optional[str] = None

def get_mock_embedding(text: str):
    random.seed(text) 
    return [random.random() for _ in range(1536)]

@app.get("/")
def health_check():
    return {"status": "online", "message": "AgentOps is ready."}

@app.post("/search", dependencies=[Depends(RateLimiter(times=5, seconds=60))])
def search_logs(
    payload: SearchQuery, 
    api_key: str = Security(get_api_key)
):
    start_time = time.time()
    try:
        vector = get_mock_embedding(payload.query)
        
        with pool.connection() as conn:
            with conn.cursor() as cur:
                sql_query = """
                    SELECT id, ts, agent_id, level, action, payload, 
                           (embedding <=> %s::vector) as distance
                    FROM agent_logs
                """
                params = [vector]

                if payload.agent_id:
                    sql_query += " WHERE agent_id = %s "
                    params.append(payload.agent_id)
                
                sql_query += " ORDER BY distance ASC LIMIT %s"
                params.append(payload.limit)
                
                cur.execute(sql_query, params)
                rows = cur.fetchall()
                
        results = []
        for row in rows:
            results.append({
                "id": row["id"],
                "timestamp": row["ts"],
                "agent_id": row["agent_id"],
                "score": 1 - row["distance"],
                "action": row["action"],
                "payload": row["payload"]
            })
            
        return {"meta": {"took": time.time() - start_time}, "results": results}

    except Exception as e:
        print(f"Server Error: {e}") 
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)