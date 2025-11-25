# .env.example - Configuration ObsidiaShell
# Copier ce fichier vers .env et remplir avec vos vraies valeurs

# ============================================================================
# OPENAI API (REQUIS)
# ============================================================================
OPENAI_API_KEY=sk-your-openai-api-key-here

# ============================================================================
# DATABASES PASSWORDS
# ============================================================================

# Neo4j (Graphiti)
NEO4J_PASSWORD=obsidia2024

# MongoDB (FastGPT)
MONGODB_USERNAME=obsidia
MONGODB_PASSWORD=obsidia2024

# PostgreSQL (Danswer)
POSTGRES_USER=obsidia
POSTGRES_PASSWORD=obsidia2024

# ============================================================================
# SECURITY
# ============================================================================

# JWT Secret (IMPORTANT: Changer en production!)
JWT_SECRET=change-me-to-a-very-long-random-string-in-production

# CORS Origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# ============================================================================
# MONITORING
# ============================================================================

# Grafana
GRAFANA_PASSWORD=obsidia2024

# Alertes
ADMIN_EMAIL=admin@obsidia.local
WEBHOOK_URL=https://your-webhook-url.com/alerts

# ============================================================================
# OPTIONAL: Custom Ports (si conflit)
# ============================================================================

# GATEWAY_PORT=8000
# GRAPHITI_PORT=8001
# FASTGPT_PORT=3000
# DANSWER_PORT=8080

---

# GUIDE DE DÉMARRAGE RAPIDE

## Installation en 5 minutes

```bash
# 1. Créer la structure
mkdir ObsidiaShell && cd ObsidiaShell
mkdir -p apps obsidia_data obsidia_config obsidia_core

# 2. Cloner les projets
cd apps
git clone https://github.com/getzep/graphiti.git
git clone https://github.com/labring/FastGPT.git
git clone https://github.com/danswer-ai/danswer.git onyx
cd ..

# 3. Copier les fichiers générés
# - agent_bridge.py → obsidia_core/
# - unify_config.yaml → obsidia_config/
# - docker-compose.unified.yml → racine
# - .env.example → .env (puis éditer)

# 4. Configurer l'environnement
cp .env.example .env
nano .env  # Ajouter votre clé OpenAI

# 5. Créer le Dockerfile du gateway
cat > obsidia_core/Dockerfile.gateway << 'EOF'
FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn[standard] httpx pyyaml python-dotenv
COPY agent_bridge.py .
CMD ["python", "agent_bridge.py"]
EOF

# 6. Lancer !
docker-compose -f docker-compose.unified.yml up -d

# 7. Vérifier
curl http://localhost:8000/health
```

## Premiers Tests

```bash
# Health check
curl http://localhost:8000/health

# Accéder au dashboard FastGPT
open http://localhost:3001

# Accéder à l'interface Danswer
open http://localhost:3002

# Monitoring Grafana
open http://localhost:3003  # admin/obsidia2024
```

## Structure des données

```bash
# Créer les dossiers de données
mkdir -p obsidia_data/{maps_first,lot_A_ancien,lot_B_intermediaire,lot_C_recent}

# Ajouter vos fichiers
cp /chemin/vers/vos/docs/* obsidia_data/lot_A_ancien/

# Lancer l'ingestion
docker-compose exec gateway python -m obsidia_core.pipeline_runner
```

## Commandes Utiles

```bash
# Voir les logs
docker-compose -f docker-compose.unified.yml logs -f

# Redémarrer un service
docker-compose -f docker-compose.unified.yml restart gateway

# Arrêter tout
docker-compose -f docker-compose.unified.yml down

# Nettoyer (ATTENTION: supprime les données!)
docker-compose -f docker-compose.unified.yml down -v
```

---

# CHECKLIST POST-INSTALLATION

- [ ] Les 3 services (graphiti, fastgpt, danswer) sont "healthy"
- [ ] Le gateway répond sur http://localhost:8000/health
- [ ] Les dashboards sont accessibles (ports 3001, 3002, 3003)
- [ ] Les bases de données sont initialisées
- [ ] Les volumes persistent les données
- [ ] Grafana affiche les métriques
- [ ] Les logs sont propres (pas d'erreurs critiques)

---

# ARCHITECTURE DES FICHIERS GÉNÉRÉS

```
ObsidiaShell/
├── obsidia_core/
│   ├── agent_bridge.py          ✅ API Gateway
│   ├── Dockerfile.gateway       ✅ Container config
│   ├── ingest.py                ⏳ À créer
│   ├── classify.py              ⏳ À créer
│   ├── index.py                 ⏳ À créer
│   └── unify.py                 ⏳ À créer
│
├── obsidia_config/
│   ├── unify_config.yaml        ✅ Config unifiée
│   ├── obsidia_domains.json     ✅ 24 domaines
│   ├── graphiti_config.yaml     ⏳ À adapter
│   ├── fastgpt_config.yaml      ⏳ À adapter
│   └── onyx_config.yaml         ⏳ À adapter
│
├── docker-compose.unified.yml   ✅ Stack complète
├── .env                         ✅ Variables
└── README.md                    ✅ Documentation
```

✅ = Fichiers générés et prêts
⏳ = Fichiers à créer/adapter selon besoins

---

# PROCHAINES ÉTAPES

1. **Tester l'infrastructure** : Vérifier que tout démarre
2. **Adapter les configs** : Personnaliser selon vos besoins
3. **Créer les pipelines** : ingest.py, classify.py, etc.
4. **Ajouter vos données** : Remplir obsidia_data/
5. **Développer l'UI unifiée** : Dashboard custom si besoin
6. **Configurer les agents** : Automatisation avancée
7. **Production ready** : SSL, backups, monitoring avancé

---

# RESSOURCES

- Documentation Graphiti: https://github.com/getzep/graphiti
- Documentation FastGPT: https://doc.fastgpt.in/
- Documentation Danswer: https://docs.danswer.dev/

# SUPPORT

En cas de problème :
1. Vérifier les logs : `docker-compose logs -f`
2. Consulter /health de chaque service
3. Examiner obsidia-logs/ pour détails

---

**ObsidiaShell** - Plateforme AGI Unifiée
Version 1.0.0 | Novembre 2025
