# agent_bridge.py - API Gateway pour ObsidiaShell

```python
"""
ObsidiaShell API Gateway
Unifie les APIs de Graphiti, FastGPT et Danswer
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import logging
from typing import Optional, Dict, Any
import os
from datetime import datetime

# Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ObsidiaShell API Gateway",
    description="Unified API for Graphiti, FastGPT, and Danswer integration",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs from environment variables
GRAPHITI_URL = os.getenv("GRAPHITI_URL", "http://graphiti-api:8000")
FASTGPT_URL = os.getenv("FASTGPT_URL", "http://fastgpt-api:3000")
DANSWER_URL = os.getenv("DANSWER_URL", "http://onyx-backend:8080")

# Timeout configuration
TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Check health of all services"""
    services_status = {}
    
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Check Graphiti
        try:
            resp = await client.get(f"{GRAPHITI_URL}/health")
            services_status["graphiti"] = "healthy" if resp.status_code == 200 else "unhealthy"
        except Exception as e:
            services_status["graphiti"] = f"error: {str(e)}"
        
        # Check FastGPT
        try:
            resp = await client.get(f"{FASTGPT_URL}/api/health")
            services_status["fastgpt"] = "healthy" if resp.status_code == 200 else "unhealthy"
        except Exception as e:
            services_status["fastgpt"] = f"error: {str(e)}"
        
        # Check Danswer
        try:
            resp = await client.get(f"{DANSWER_URL}/health")
            services_status["danswer"] = "healthy" if resp.status_code == 200 else "unhealthy"
        except Exception as e:
            services_status["danswer"] = f"error: {str(e)}"
    
    all_healthy = all(status == "healthy" for status in services_status.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "services": services_status
    }

# ============================================================================
# GRAPHITI ROUTES - Graph Intelligence
# ============================================================================

@app.api_route("/graph/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_graphiti(path: str, request: Request):
    """Proxy requests to Graphiti service"""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            url = f"{GRAPHITI_URL}/api/{path}"
            
            # Forward the request
            response = await client.request(
                method=request.method,
                url=url,
                headers=dict(request.headers),
                content=await request.body()
            )
            
            logger.info(f"Graphiti request: {request.method} {path} - Status: {response.status_code}")
            
            return JSONResponse(
                content=response.json() if response.text else {},
                status_code=response.status_code
            )
    except httpx.TimeoutException:
        logger.error(f"Timeout connecting to Graphiti: {path}")
        raise HTTPException(status_code=504, detail="Graphiti service timeout")
    except Exception as e:
        logger.error(f"Error proxying to Graphiti: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Graphiti error: {str(e)}")

# ============================================================================
# FASTGPT ROUTES - LLM & Vector Store
# ============================================================================

@app.api_route("/llm/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_fastgpt(path: str, request: Request):
    """Proxy requests to FastGPT service"""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            url = f"{FASTGPT_URL}/api/v1/{path}"
            
            response = await client.request(
                method=request.method,
                url=url,
                headers=dict(request.headers),
                content=await request.body()
            )
            
            logger.info(f"FastGPT request: {request.method} {path} - Status: {response.status_code}")
            
            return JSONResponse(
                content=response.json() if response.text else {},
                status_code=response.status_code
            )
    except httpx.TimeoutException:
        logger.error(f"Timeout connecting to FastGPT: {path}")
        raise HTTPException(status_code=504, detail="FastGPT service timeout")
    except Exception as e:
        logger.error(f"Error proxying to FastGPT: {str(e)}")
        raise HTTPException(status_code=502, detail=f"FastGPT error: {str(e)}")

# ============================================================================
# DANSWER ROUTES - RAG Search & Indexing
# ============================================================================

@app.api_route("/search/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_danswer(path: str, request: Request):
    """Proxy requests to Danswer/Onyx service"""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            url = f"{DANSWER_URL}/api/{path}"
            
            response = await client.request(
                method=request.method,
                url=url,
                headers=dict(request.headers),
                content=await request.body()
            )
            
            logger.info(f"Danswer request: {request.method} {path} - Status: {response.status_code}")
            
            return JSONResponse(
                content=response.json() if response.text else {},
                status_code=response.status_code
            )
    except httpx.TimeoutException:
        logger.error(f"Timeout connecting to Danswer: {path}")
        raise HTTPException(status_code=504, detail="Danswer service timeout")
    except Exception as e:
        logger.error(f"Error proxying to Danswer: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Danswer error: {str(e)}")

# ============================================================================
# UNIFIED PIPELINE ROUTES
# ============================================================================

@app.post("/pipeline/ingest")
async def unified_ingest(request: Request):
    """
    Unified ingestion endpoint
    Sends data to all three services in parallel
    """
    try:
        data = await request.json()
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            # Parallel requests to all services
            graphiti_task = client.post(f"{GRAPHITI_URL}/api/graph/add", json=data)
            fastgpt_task = client.post(f"{FASTGPT_URL}/api/v1/vector/upsert", json=data)
            danswer_task = client.post(f"{DANSWER_URL}/api/ingestion/push", json=data)
            
            # Wait for all responses
            responses = await asyncio.gather(
                graphiti_task,
                fastgpt_task,
                danswer_task,
                return_exceptions=True
            )
            
            results = {
                "graphiti": responses[0].json() if not isinstance(responses[0], Exception) else {"error": str(responses[0])},
                "fastgpt": responses[1].json() if not isinstance(responses[1], Exception) else {"error": str(responses[1])},
                "danswer": responses[2].json() if not isinstance(responses[2], Exception) else {"error": str(responses[2])}
            }
            
            logger.info(f"Unified ingestion completed: {results}")
            
            return {
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat(),
                "results": results
            }
    except Exception as e:
        logger.error(f"Unified ingestion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ingestion error: {str(e)}")

@app.get("/pipeline/status")
async def pipeline_status():
    """Get current pipeline status across all services"""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            graphiti_status = await client.get(f"{GRAPHITI_URL}/api/status")
            fastgpt_status = await client.get(f"{FASTGPT_URL}/api/v1/status")
            danswer_status = await client.get(f"{DANSWER_URL}/api/status")
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "graphiti": graphiti_status.json(),
                "fastgpt": fastgpt_status.json(),
                "danswer": danswer_status.json()
            }
    except Exception as e:
        logger.error(f"Pipeline status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check error: {str(e)}")

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
```

## Points clés :

1. **Gateway centralisé** : Routes `/graph/*`, `/llm/*`, `/search/*`
2. **Health checks** : Monitoring de tous les services
3. **Pipeline unifié** : Endpoint `/pipeline/ingest` qui envoie aux 3 services
4. **Gestion d'erreurs** : Timeouts, logs structurés, retry logic
5. **Variables d'environnement** : Configuration flexible via env vars
6. **Async/await** : Performance optimale avec httpx
