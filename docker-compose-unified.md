# docker-compose.unified.yml - ObsidiaShell Complete Stack

```yaml
version: '3.8'

# ============================================================================
# NETWORKS
# ============================================================================
networks:
  obsidia-network:
    driver: bridge
  obsidia-internal:
    driver: bridge
    internal: true

# ============================================================================
# VOLUMES
# ============================================================================
volumes:
  neo4j-data:
  mongodb-data:
  postgres-data:
  redis-data:
  qdrant-data:
  elasticsearch-data:
  obsidia-data:
  obsidia-logs:

# ============================================================================
# SERVICES
# ============================================================================
services:

  # ==========================================================================
  # API GATEWAY
  # ==========================================================================
  gateway:
    build:
      context: ./obsidia_core
      dockerfile: Dockerfile.gateway
    container_name: obsidia-gateway
    ports:
      - "8000:8000"
    environment:
      - GRAPHITI_URL=http://graphiti-api:8000
      - FASTGPT_URL=http://fastgpt-api:3000
      - DANSWER_URL=http://onyx-backend:8080
      - LOG_LEVEL=INFO
    volumes:
      - ./obsidia_core:/app
      - obsidia-logs:/var/log/obsidia
    networks:
      - obsidia-network
    depends_on:
      - graphiti-api
      - fastgpt-api
      - onyx-backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ==========================================================================
  # GRAPHITI - Graph Intelligence
  # ==========================================================================
  graphiti-api:
    build:
      context: ./apps/graphiti
      dockerfile: Dockerfile
    container_name: graphiti-api
    ports:
      - "8001:8000"
    environment:
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USERNAME=neo4j
      - NEO4J_PASSWORD=${NEO4J_PASSWORD:-obsidia2024}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LOG_LEVEL=INFO
    volumes:
      - ./apps/graphiti:/app
      - ./obsidia_config/graphiti_config.yaml:/app/config/config.yaml
      - obsidia-data:/data
    networks:
      - obsidia-network
      - obsidia-internal
    depends_on:
      - neo4j
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  # ==========================================================================
  # FASTGPT - LLM & Vector Store
  # ==========================================================================
  fastgpt-api:
    build:
      context: ./apps/FastGPT
      dockerfile: docker/api.Dockerfile
    container_name: fastgpt-api
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/fastgpt
      - REDIS_URL=redis://redis:6379
      - QDRANT_URL=http://qdrant:6333
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NODE_ENV=production
    volumes:
      - ./apps/FastGPT:/app
      - ./obsidia_config/fastgpt_config.yaml:/app/config/config.yaml
      - obsidia-data:/data
    networks:
      - obsidia-network
      - obsidia-internal
    depends_on:
      - mongodb
      - redis
      - qdrant
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

  fastgpt-worker:
    build:
      context: ./apps/FastGPT
      dockerfile: docker/worker.Dockerfile
    container_name: fastgpt-worker
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/fastgpt
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - WORKER_CONCURRENCY=8
    volumes:
      - ./apps/FastGPT:/app
      - obsidia-data:/data
    networks:
      - obsidia-internal
    depends_on:
      - mongodb
      - redis
      - fastgpt-api
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 4G

  fastgpt-dashboard:
    build:
      context: ./apps/FastGPT
      dockerfile: docker/dashboard.Dockerfile
    container_name: fastgpt-dashboard
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://gateway:8000
      - NODE_ENV=production
    volumes:
      - ./apps/FastGPT/apps/dashboard:/app
    networks:
      - obsidia-network
    depends_on:
      - fastgpt-api
    restart: unless-stopped

  # ==========================================================================
  # DANSWER/ONYX - RAG Search & Indexing
  # ==========================================================================
  onyx-backend:
    build:
      context: ./apps/onyx
      dockerfile: docker/onyx.Dockerfile
    container_name: onyx-backend
    ports:
      - "8080:8080"
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=danswer
      - POSTGRES_USER=${POSTGRES_USER:-obsidia}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-obsidia2024}
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET=${JWT_SECRET:-change-me-in-production}
    volumes:
      - ./apps/onyx/backend:/app
      - ./obsidia_config/onyx_config.yaml:/app/config/config.yaml
      - obsidia-data:/data
    networks:
      - obsidia-network
      - obsidia-internal
    depends_on:
      - postgres
      - elasticsearch
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

  onyx-frontend:
    build:
      context: ./apps/onyx/frontend
      dockerfile: Dockerfile
    container_name: onyx-frontend
    ports:
      - "3002:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://gateway:8000
      - NODE_ENV=production
    networks:
      - obsidia-network
    depends_on:
      - onyx-backend
    restart: unless-stopped

  onyx-worker:
    build:
      context: ./apps/onyx
      dockerfile: docker/onyx.Dockerfile
    container_name: onyx-worker
    command: python -m backend.worker
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=danswer
      - POSTGRES_USER=${POSTGRES_USER:-obsidia}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-obsidia2024}
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./apps/onyx/backend:/app
      - obsidia-data:/data
    networks:
      - obsidia-internal
    depends_on:
      - postgres
      - elasticsearch
      - onyx-backend
    restart: unless-stopped
    deploy:
      replicas: 2

  # ==========================================================================
  # DATABASES & SERVICES
  # ==========================================================================
  
  # Neo4j - Graph Database
  neo4j:
    image: neo4j:5.15
    container_name: neo4j
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD:-obsidia2024}
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_memory_heap_max__size=2G
      - NEO4J_dbms_memory_pagecache_size=1G
    volumes:
      - neo4j-data:/data
    networks:
      - obsidia-internal
    restart: unless-stopped

  # MongoDB - FastGPT Database
  mongodb:
    image: mongo:7.0
    container_name: mongodb
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGODB_USERNAME:-obsidia}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGODB_PASSWORD:-obsidia2024}
    volumes:
      - mongodb-data:/data/db
    networks:
      - obsidia-internal
    restart: unless-stopped
    command: mongod --wiredTigerCacheSizeGB 2

  # PostgreSQL - Danswer Database
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=danswer
      - POSTGRES_USER=${POSTGRES_USER:-obsidia}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-obsidia2024}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - obsidia-internal
    restart: unless-stopped
    shm_size: 256mb

  # Redis - Queue & Cache
  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - obsidia-internal
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru

  # Qdrant - Vector Database
  qdrant:
    image: qdrant/qdrant:v1.7.4
    container_name: qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant-data:/qdrant/storage
    networks:
      - obsidia-internal
    restart: unless-stopped

  # Elasticsearch - Search Engine
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    ports:
      - "9200:9200"
      - "9300:9300"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - obsidia-internal
    restart: unless-stopped

  # ==========================================================================
  # MONITORING
  # ==========================================================================
  
  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - obsidia-network
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3003:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-obsidia2024}
    volumes:
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    networks:
      - obsidia-network
    depends_on:
      - prometheus
    restart: unless-stopped
```

## Instructions de déploiement :

```bash
# 1. Créer le fichier .env
cp .env.example .env
# Éditer .env avec vos clés API

# 2. Lancer l'ensemble de la stack
docker-compose -f docker-compose.unified.yml up -d

# 3. Vérifier le statut
docker-compose -f docker-compose.unified.yml ps

# 4. Voir les logs
docker-compose -f docker-compose.unified.yml logs -f gateway

# 5. Accéder aux interfaces
# - Gateway API: http://localhost:8000
# - FastGPT Dashboard: http://localhost:3001
# - Onyx Frontend: http://localhost:3002
# - Grafana: http://localhost:3003
# - Neo4j Browser: http://localhost:7474
```
