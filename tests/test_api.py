# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from api.main import app

# --- FIXTURE: The "Boot Up" Sequence ---
@pytest.fixture(scope="module")
def client():
    # The 'with' statement triggers the lifespan events (Startup/Shutdown)
    with TestClient(app) as c:
        yield c  # Give the running client to the tests

def test_health_check(client):
    """Verify the API is actually running."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "online", "message": "AgentOps is ready."}

def test_search_unauthorized(client):
    """Verify that intruders get blocked (403)."""
    # Try searching without headers
    response = client.post("/search", json={"query": "test", "limit": 1})
    assert response.status_code == 403
    assert "Could not validate credentials" in response.json()["detail"]

def test_search_authorized(client):
    """Verify that valid keys get results (200)."""
    headers = {"X-API-Key": "sk-agentops-secret-123"}
    payload = {
        "query": "error",
        "limit": 1,
        # We search for an ID we know exists (agent_0 is created by your benchmark)
        "agent_id": "agent_0" 
    }
    
    response = client.post("/search", headers=headers, json=payload)
    
    # 200 means the API worked and Redis let us through
    assert response.status_code == 200
    
    # Check that we got a list back
    data = response.json()
    assert "results" in data
    assert isinstance(data["results"], list)