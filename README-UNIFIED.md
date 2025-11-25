# ObsidiaShell - README Unifié

## 🚀 Plateforme AGI Unifiée

ObsidiaShell est une plateforme AGI intégrant trois technologies open-source de pointe :
- **Graphiti** : Intelligence graphique et cartographie fractale
- **FastGPT** : LLM, classification automatique et vector store
- **Danswer/Onyx** : RAG, recherche sémantique et indexation

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSIDIA SHELL                             │
│                   Unified Dashboard                          │
│          (FastGPT UI + Onyx UI + Graphiti Viz)              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              API GATEWAY (agent_bridge.py)                   │
│                    Port: 8000                                │
│     /graph/*  │  /llm/*  │  /search/*  │  /pipeline/*       │
└───────┬───────┴────┬─────┴──────┬──────┴────────────────────┘
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ GRAPHITI │  │ FASTGPT  │  │  DANSWER │
│  :8001   │  │  :3000   │  │  :8080   │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│ Neo4j   │  │ MongoDB  │  │ Postgres │
│ Qdrant  │  │ Redis    │  │Elastic   │
└─────────┘  └──────────┘  └──────────┘

        ┌─────────────────────────┐
        │   UNIFIED PIPELINE      │
        │   obsidia_core/         │
        │   - ingest.py           │
        │   - classify.py         │
        │   - index.py            │
        │   - unify.py            │
        └─────────────────────────┘
```

---

## 📂 Structure du Projet

```
ObsidiaShell/
│
├── apps/                      # Projets GitHub fusionnés
│   ├── graphiti/              # Graph Intelligence
│   ├── FastGPT/               # LLM & Vector Store
│   └── onyx/                  # RAG & Search
│
├── obsidia_data/              # Données à traiter
│   ├── maps_first/            # Cartes structurelles
│   ├── lot_A_ancien/          # Fondations
│   ├── lot_B_intermediaire/   # Consolidation
│   └── lot_C_recent/          # Finalisation
│
├── obsidia_config/            # Configurations
│   ├── graphiti_config.yaml
│   ├── fastgpt_config.yaml
│   ├── onyx_config.yaml
│   ├── unify_config.yaml      # ✅ Config unifiée
│   └── obsidia_domains.json   # 24 domaines
│
├── obsidia_core/              # Pipelines & Bridge
│   ├── agent_bridge.py        # ✅ API Gateway
│   ├── ingest.py              # Pipeline ingestion
│   ├── classify.py            # Classification
│   ├── index.py               # Indexation
│   ├── unify.py               # Synchronisation
│   └── utils/
│
├── docker-compose.unified.yml # ✅ Stack complète
├── .env.example               # Variables d'environnement
└── README.md                  # Ce fichier
```

---

## 🛠️ Installation

### Prérequis

- Docker 24+ et Docker Compose
- 16GB RAM minimum (32GB recommandé)
- 50GB d'espace disque
- Clé API OpenAI (pour embeddings et LLM)

### Étape 1 : Cloner les dépôts

```bash
# Créer le dossier racine
mkdir ObsidiaShell && cd ObsidiaShell

# Créer la structure
mkdir -p apps obsidia_data obsidia_config obsidia_core

# Cloner les 3 projets
cd apps
git clone https://github.com/getzep/graphiti.git
git clone https://github.com/labring/FastGPT.git
git clone https://github.com/danswer-ai/danswer.git onyx
cd ..
```

### Étape 2 : Configuration

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer avec vos clés
nano .env
```

**Fichier `.env` minimal :**

```bash
# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Databases
NEO4J_PASSWORD=obsidia2024
MONGODB_USERNAME=obsidia
MONGODB_PASSWORD=obsidia2024
POSTGRES_USER=obsidia
POSTGRES_PASSWORD=obsidia2024

# Security
JWT_SECRET=change-me-in-production-use-strong-random-string
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Monitoring
GRAFANA_PASSWORD=obsidia2024
ADMIN_EMAIL=admin@obsidia.local
```

### Étape 3 : Placer les fichiers générés

```bash
# Copier agent_bridge.py
cp agent_bridge.py obsidia_core/

# Copier les configs
cp unify_config.yaml obsidia_config/
cp obsidia_domains.json obsidia_config/

# Créer le Dockerfile pour le gateway
cat > obsidia_core/Dockerfile.gateway << 'EOF'
FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    httpx \
    pyyaml \
    python-dotenv

COPY agent_bridge.py .

CMD ["python", "agent_bridge.py"]
EOF
```

### Étape 4 : Lancer la stack

```bash
# Build et démarrage
docker-compose -f docker-compose.unified.yml up -d

# Vérifier le statut
docker-compose -f docker-compose.unified.yml ps

# Suivre les logs du gateway
docker-compose -f docker-compose.unified.yml logs -f gateway
```

---

## 🌐 Accès aux Services

| Service | URL | Description |
|---------|-----|-------------|
| **API Gateway** | http://localhost:8000 | Point d'entrée unifié |
| **Gateway Health** | http://localhost:8000/health | Status de tous les services |
| **FastGPT Dashboard** | http://localhost:3001 | Interface LLM & Classification |
| **Onyx Frontend** | http://localhost:3002 | Interface RAG & Recherche |
| **Grafana** | http://localhost:3003 | Monitoring (admin/obsidia2024) |
| **Neo4j Browser** | http://localhost:7474 | Graph Database (neo4j/obsidia2024) |
| **Prometheus** | http://localhost:9090 | Métriques |

---

## 📊 Utilisation

### 1. Vérifier la santé des services

```bash
curl http://localhost:8000/health
```

**Réponse attendue :**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T17:00:00",
  "services": {
    "graphiti": "healthy",
    "fastgpt": "healthy",
    "danswer": "healthy"
  }
}
```

### 2. Ingestion unifiée

```bash
curl -X POST http://localhost:8000/pipeline/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "document.pdf",
    "content": "Contenu du document...",
    "metadata": {
      "domain": "Mathématiques du millénaire",
      "lot": "lot_A_ancien"
    }
  }'
```

### 3. Recherche via Danswer

```bash
curl -X POST http://localhost:8000/search/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Balance exponentielle fractale",
    "top_k": 10
  }'
```

### 4. Classification via FastGPT

```bash
curl -X POST http://localhost:8000/llm/classify \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Document sur les agents autonomes...",
    "domains": ["Agents Obsidia", "Multi-agents"]
  }'
```

### 5. Visualisation graphe via Graphiti

```bash
curl http://localhost:8000/graph/visualize?domain=Agents%20Obsidia
```

---

## 🔄 Pipeline d'Ingestion

Le pipeline suit cet ordre de traitement :

```
1. maps_first/          → Structure maîtresse
2. lot_A_ancien/        → Fondations historiques
3. lot_B_intermediaire/ → Consolidation
4. lot_C_recent/        → Finalisation récente
```

**Lancer le pipeline complet :**

```bash
docker-compose -f docker-compose.unified.yml exec gateway \
  python -m obsidia_core.pipeline_runner --full
```

---

## 🐛 Dépannage

### Les services ne démarrent pas

```bash
# Vérifier les logs
docker-compose -f docker-compose.unified.yml logs

# Redémarrer un service spécifique
docker-compose -f docker-compose.unified.yml restart gateway
```

### Bases de données non initialisées

```bash
# Réinitialiser les volumes
docker-compose -f docker-compose.unified.yml down -v
docker-compose -f docker-compose.unified.yml up -d
```

### Problèmes de mémoire

Augmenter les limites dans `docker-compose.unified.yml` :

```yaml
deploy:
  resources:
    limits:
      memory: 16G  # Au lieu de 8G
```

---

## 📈 Monitoring

### Grafana Dashboards

Accéder à http://localhost:3003
- Login: `admin` / `obsidia2024`
- Importer les dashboards depuis `monitoring/grafana/dashboards/`

### Métriques Prometheus

```bash
# Status du pipeline
curl http://localhost:9090/api/v1/query?query=pipeline_status

# Latence du gateway
curl http://localhost:9090/api/v1/query?query=gateway_latency_seconds
```

---

## 🔐 Sécurité

### Production Checklist

- [ ] Changer tous les mots de passe par défaut
- [ ] Générer un JWT_SECRET fort (32+ caractères aléatoires)
- [ ] Configurer HTTPS avec certificats SSL
- [ ] Activer l'authentification sur Neo4j
- [ ] Restreindre ALLOWED_ORIGINS
- [ ] Activer les backups automatiques
- [ ] Configurer les logs centralisés

---

## 🚀 Prochaines Étapes

1. **Personnaliser les domaines** dans `obsidia_config/obsidia_domains.json`
2. **Ajouter vos données** dans `obsidia_data/`
3. **Configurer les workflows** dans `obsidia_core/`
4. **Créer des agents spécialisés** pour l'automatisation
5. **Développer l'interface unifiée** custom si nécessaire

---

## 📚 Documentation Technique

- [Graphiti Docs](https://github.com/getzep/graphiti)
- [FastGPT Docs](https://github.com/labring/FastGPT)
- [Danswer Docs](https://github.com/danswer-ai/danswer)

---

## 🤝 Support

Pour toute question ou problème :
- Consulter les logs : `docker-compose logs -f`
- Vérifier `/health` de chaque service
- Examiner `obsidia-logs/` pour les détails

---

## 📝 Licence

Ce projet combine trois projets open-source sous leurs licences respectives. Consulter chaque dépôt pour les détails.

---

**ObsidiaShell** - Projet AGI Laboratoire Indépendant  
Version 1.0.0 - Novembre 2025
