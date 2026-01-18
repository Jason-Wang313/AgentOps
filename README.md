# AgentOps: Distributed Observability for AI Agents

**AgentOps** is a high-throughput observability cluster designed to debug and monitor autonomous AI agents at scale. It provides real-time visibility into agent decision chains, latency metrics, and tool usage.

![Dashboard Preview](https://github.com/Jason-Wang313/AgentOps/blob/main/dashboard-preview.png?raw=true)
*(<img width="1914" height="1066" alt="image" src="https://github.com/user-attachments/assets/5eb09269-4cc2-42d4-ad21-03a8ad6dd366" />
)*

## 🚀 Key capabilities

* **High-Scale Ingestion:** Custom Python engine capable of processing **1GB/minute** of agent logs.
* **Real-Time Monitoring:** Node.js WebSocket server handling **10k+ concurrent streams** for live latency tracking.
* **Hybrid Storage:** Postgres + `pgvector` for storing both structured logs and semantic traces.
* **Trace Visualization:** Interactive "Mission Control" dashboard to inspect agent reasoning steps (CoT) and identify failures.

## 🛠️ Architecture

* **Ingestion:** Python (Multiprocessing)
* **Database:** PostgreSQL + pgvector
* **Backend:** FastAPI & Node.js (WebSockets)
* **Frontend:** Next.js + Tailwind + Recharts
* **Infrastructure:** Docker & Docker Compose

## ⚡ Quick Start

The entire stack is containerized for easy deployment.

```bash
# 1. Clone the repo
git clone [https://github.com/Jason-Wang313/AgentOps.git](https://github.com/Jason-Wang313/AgentOps.git)

# 2. Start the cluster
docker-compose up --build

# 3. Access the dashboard
# Visit https://agent-opsssssssssss.vercel.app/
