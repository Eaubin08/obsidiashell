# unify_config.yaml - Configuration Unifiée ObsidiaShell

```yaml
# ============================================================================
# ObsidiaShell - Configuration Unifiée
# Fusion des configurations Graphiti, FastGPT et Danswer
# ============================================================================

version: "1.0.0"
environment: production

# ============================================================================
# GRAPHITI - Graph Intelligence Configuration
# ============================================================================
graph:
  service_name: graphiti
  host: graphiti-api
  port: 8000
  api_version: v1
  
  database:
    type: neo4j
    host: neo4j
    port: 7687
    username: neo4j
    password: ${NEO4J_PASSWORD}
    database: obsidia_graph
  
  embeddings:
    provider: openai
    model: text-embedding-3-small
    dimension: 1536
    batch_size: 100
  
  graph_builder:
    auto_create_nodes: true
    max_connections_per_node: 50
    similarity_threshold: 0.7
    clustering_algorithm: louvain
  
  ingestion:
    batch_size: 50
    parallel_workers: 4
    retry_attempts: 3

# ============================================================================
# FASTGPT - LLM & Vector Store Configuration
# ============================================================================
llm:
  service_name: fastgpt
  host: fastgpt-api
  port: 3000
  api_version: v1
  
  database:
    mongodb:
      host: mongodb
      port: 27017
      database: fastgpt
      username: ${MONGODB_USERNAME}
      password: ${MONGODB_PASSWORD}
  
  vector_store:
    provider: qdrant
    host: qdrant
    port: 6333
    collection: obsidia_vectors
    distance_metric: cosine
    vector_size: 1536
  
  llm_config:
    provider: openai
    model: gpt-4-turbo-preview
    temperature: 0.7
    max_tokens: 4000
    streaming: true
  
  classification:
    auto_tagging: true
    max_tags_per_document: 10
    confidence_threshold: 0.6
    clustering_enabled: true
  
  worker:
    concurrency: 8
    queue_name: fastgpt_queue
    redis_host: redis
    redis_port: 6379

# ============================================================================
# DANSWER/ONYX - RAG Search & Indexing Configuration
# ============================================================================
rag:
  service_name: danswer
  host: onyx-backend
  port: 8080
  api_version: v1
  
  database:
    postgres:
      host: postgres
      port: 5432
      database: danswer
      username: ${POSTGRES_USERNAME}
      password: ${POSTGRES_PASSWORD}
      pool_size: 20
  
  search:
    engine: elasticsearch
    host: elasticsearch
    port: 9200
    index_name: obsidia_docs
    refresh_interval: 5s
  
  retrieval:
    top_k: 10
    hybrid_search: true
    semantic_weight: 0.7
    keyword_weight: 0.3
    reranking_enabled: true
    reranker_model: cross-encoder/ms-marco-MiniLM-L-12-v2
  
  ingestion:
    chunk_size: 512
    chunk_overlap: 50
    supported_formats:
      - pdf
      - docx
      - md
      - txt
      - html
    ocr_enabled: true
    language_detection: true
  
  auth:
    enabled: true
    jwt_secret: ${JWT_SECRET}
    token_expiry: 86400  # 24 hours

# ============================================================================
# UNIFIED PIPELINE Configuration
# ============================================================================
pipeline:
  name: obsidia_unified_pipeline
  
  ingestion_order:
    - maps_first
    - lot_A_ancien
    - lot_B_intermediaire
    - lot_C_recent
  
  stages:
    - name: ingest
      enabled: true
      script: obsidia_core/ingest.py
      parallel: true
      max_workers: 4
    
    - name: classify
      enabled: true
      script: obsidia_core/classify.py
      depends_on: ingest
      auto_tagging: true
    
    - name: index
      enabled: true
      script: obsidia_core/index.py
      depends_on: classify
      full_text_search: true
    
    - name: graph_build
      enabled: true
      script: obsidia_core/graph_build.py
      depends_on: index
      min_similarity: 0.7
    
    - name: unify
      enabled: true
      script: obsidia_core/unify.py
      depends_on: [classify, index, graph_build]
      sync_interval: 60  # seconds
  
  monitoring:
    enabled: true
    metrics_port: 9090
    log_level: INFO
    alerts:
      - type: email
        recipients: ${ADMIN_EMAIL}
        on_error: true
      - type: webhook
        url: ${WEBHOOK_URL}
        on_completion: true
  
  error_handling:
    retry_attempts: 3
    retry_delay: 5  # seconds
    continue_on_error: false
    backup_on_failure: true

# ============================================================================
# OBSIDIA DOMAINS Configuration
# ============================================================================
domains:
  total_count: 24
  classification_mode: auto  # auto, manual, hybrid
  
  list:
    - id: 1
      name: "Mathématiques du millénaire"
      keywords: [math, riemann, hodge, p-vs-np]
    
    - id: 2
      name: "Cognition vivante"
      keywords: [cognition, consciousness, awareness]
    
    - id: 3
      name: "Éthique / gouvernance"
      keywords: [ethics, governance, avdr]
    
    - id: 4
      name: "Cosmologie fractale"
      keywords: [fractal, cosmos, universe]
    
    - id: 5
      name: "Agents Obsidia"
      keywords: [agents, multi-agent, autonomous]
    
    - id: 6
      name: "Mémoire fractale"
      keywords: [memory, fractal-memory, recall]
    
    - id: 7
      name: "Double Filtre"
      keywords: [double-filter, filtering, validation]
    
    - id: 8
      name: "AVDR"
      keywords: [avdr, protocol, ethics]
    
    - id: 9
      name: "Balance λ(t)"
      keywords: [balance, lambda, exponential]
    
    - id: 10
      name: "Automatisation"
      keywords: [automation, workflow, pipeline]

# ============================================================================
# SECURITY & AUTHENTICATION
# ============================================================================
security:
  api_keys_required: true
  rate_limiting:
    enabled: true
    requests_per_minute: 100
    burst: 20
  
  cors:
    allowed_origins: ${ALLOWED_ORIGINS}
    allow_credentials: true
  
  encryption:
    at_rest: true
    in_transit: true
    algorithm: AES-256

# ============================================================================
# LOGGING & MONITORING
# ============================================================================
logging:
  level: INFO
  format: json
  output:
    - console
    - file: /var/log/obsidia/app.log
  
  rotation:
    max_size: 100MB
    max_age: 30  # days
    compress: true

monitoring:
  prometheus:
    enabled: true
    port: 9090
  
  grafana:
    enabled: true
    port: 3001
    dashboards_path: /etc/grafana/dashboards
  
  health_checks:
    interval: 30  # seconds
    timeout: 10
    retries: 3

# ============================================================================
# RESOURCE LIMITS
# ============================================================================
resources:
  graphiti:
    cpu_limit: "2"
    memory_limit: 4Gi
  
  fastgpt:
    cpu_limit: "4"
    memory_limit: 8Gi
  
  danswer:
    cpu_limit: "4"
    memory_limit: 8Gi
  
  gateway:
    cpu_limit: "2"
    memory_limit: 2Gi
```

Cette configuration unifie les trois services et définit tous les paramètres critiques pour ObsidiaShell.
