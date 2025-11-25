#!/bin/bash
# setup-obsidia.sh - Script d'Installation Automatique ObsidiaShell
# Exécuter avec: bash setup-obsidia.sh

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        ObsidiaShell - Installation Automatique          ║"
echo "║     Fusion Graphiti + FastGPT + Danswer                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# ============================================================================
# ÉTAPE 1 : Vérification des prérequis
# ============================================================================

echo -e "${YELLOW}[1/8] Vérification des prérequis...${NC}"

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker n'est pas installé. Veuillez l'installer d'abord.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installé${NC}"

# Vérifier Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose n'est pas installé. Veuillez l'installer d'abord.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installé${NC}"

# Vérifier Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ Git n'est pas installé. Veuillez l'installer d'abord.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git installé${NC}"

# ============================================================================
# ÉTAPE 2 : Création de la structure
# ============================================================================

echo -e "\n${YELLOW}[2/8] Création de la structure de dossiers...${NC}"

# Créer la structure complète
mkdir -p ObsidiaShell/{apps,obsidia_data,obsidia_config,obsidia_core,monitoring/{prometheus,grafana/dashboards}}
mkdir -p ObsidiaShell/obsidia_data/{maps_first,lot_A_ancien,lot_B_intermediaire,lot_C_recent}

cd ObsidiaShell
echo -e "${GREEN}✓ Structure créée${NC}"

# ============================================================================
# ÉTAPE 3 : Clonage des dépôts GitHub
# ============================================================================

echo -e "\n${YELLOW}[3/8] Clonage des dépôts GitHub...${NC}"

cd apps

# Graphiti
if [ ! -d "graphiti" ]; then
    echo "  Clonage de Graphiti..."
    git clone https://github.com/getzep/graphiti.git
    echo -e "${GREEN}  ✓ Graphiti cloné${NC}"
else
    echo -e "${BLUE}  ⊙ Graphiti déjà présent${NC}"
fi

# FastGPT
if [ ! -d "FastGPT" ]; then
    echo "  Clonage de FastGPT..."
    git clone https://github.com/labring/FastGPT.git
    echo -e "${GREEN}  ✓ FastGPT cloné${NC}"
else
    echo -e "${BLUE}  ⊙ FastGPT déjà présent${NC}"
fi

# Danswer (onyx)
if [ ! -d "onyx" ]; then
    echo "  Clonage de Danswer/Onyx..."
    git clone https://github.com/danswer-ai/danswer.git onyx
    echo -e "${GREEN}  ✓ Danswer/Onyx cloné${NC}"
else
    echo -e "${BLUE}  ⊙ Danswer/Onyx déjà présent${NC}"
fi

cd ..

# ============================================================================
# ÉTAPE 4 : Création du fichier .env
# ============================================================================

echo -e "\n${YELLOW}[4/8] Configuration de l'environnement...${NC}"

cat > .env << 'EOF'
# ObsidiaShell Environment Configuration
# Généré automatiquement par setup-obsidia.sh

# ============================================================================
# OPENAI API (REQUIS)
# ============================================================================
OPENAI_API_KEY=sk-your-openai-api-key-here

# ============================================================================
# DATABASES PASSWORDS
# ============================================================================
NEO4J_PASSWORD=obsidia2024
MONGODB_USERNAME=obsidia
MONGODB_PASSWORD=obsidia2024
POSTGRES_USER=obsidia
POSTGRES_PASSWORD=obsidia2024

# ============================================================================
# SECURITY
# ============================================================================
JWT_SECRET=change-me-to-a-very-long-random-string-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# ============================================================================
# MONITORING
# ============================================================================
GRAFANA_PASSWORD=obsidia2024
ADMIN_EMAIL=admin@obsidia.local
WEBHOOK_URL=
EOF

echo -e "${GREEN}✓ Fichier .env créé${NC}"
echo -e "${YELLOW}⚠ IMPORTANT: Éditer le fichier .env et ajouter votre clé OpenAI API${NC}"

# ============================================================================
# ÉTAPE 5 : Création des fichiers de configuration
# ============================================================================

echo -e "\n${YELLOW}[5/8] Création des fichiers de configuration...${NC}"

# obsidia_domains.json
cat > obsidia_config/obsidia_domains.json << 'EOF'
{
  "domains": [
    "Mathématiques du millénaire",
    "Cognition vivante",
    "Éthique / gouvernance",
    "Cosmologie fractale",
    "Agents Obsidia",
    "Mémoire fractale",
    "Double Filtre",
    "AVDR",
    "Balance λ(t)",
    "Automatisation",
    "Multimodalité / double cerveau",
    "Gestion des biais",
    "Psychologie / perception",
    "Civilisation cognitive",
    "Sciences cognitives",
    "Flux internes",
    "Friction / émergence",
    "Conscience mathématique",
    "Validation scientifique",
    "Multi-agents",
    "Cosmos ↔ Intelligence",
    "Chaos contrôlé",
    "Temporalité dynamique",
    "Calibration Chaotique Symbiotique"
  ]
}
EOF

echo -e "${GREEN}✓ obsidia_domains.json créé${NC}"

# Prometheus config
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'gateway'
    static_configs:
      - targets: ['gateway:8000']
  
  - job_name: 'graphiti'
    static_configs:
      - targets: ['graphiti-api:8001']
  
  - job_name: 'fastgpt'
    static_configs:
      - targets: ['fastgpt-api:3000']
  
  - job_name: 'danswer'
    static_configs:
      - targets: ['onyx-backend:8080']
EOF

echo -e "${GREEN}✓ Configuration Prometheus créée${NC}"

# ============================================================================
# ÉTAPE 6 : Création du Dockerfile du Gateway
# ============================================================================

echo -e "\n${YELLOW}[6/8] Création du Dockerfile du Gateway...${NC}"

cat > obsidia_core/Dockerfile.gateway << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    httpx \
    pyyaml \
    python-dotenv

# Copier le code
COPY agent_bridge.py .

# Port
EXPOSE 8000

# Démarrage
CMD ["python", "agent_bridge.py"]
EOF

echo -e "${GREEN}✓ Dockerfile.gateway créé${NC}"

# ============================================================================
# ÉTAPE 7 : Création du requirements.txt pour les pipelines
# ============================================================================

echo -e "\n${YELLOW}[7/8] Création des fichiers de dépendances...${NC}"

cat > obsidia_core/requirements.txt << 'EOF'
# ObsidiaShell Core Dependencies
httpx
pyyaml
python-dotenv
PyPDF2
python-docx
asyncio
EOF

echo -e "${GREEN}✓ requirements.txt créé${NC}"

# ============================================================================
# ÉTAPE 8 : Création du script de lancement
# ============================================================================

echo -e "\n${YELLOW}[8/8] Création du script de lancement...${NC}"

cat > start.sh << 'EOF'
#!/bin/bash
# start.sh - Lancer ObsidiaShell

echo "🚀 Démarrage d'ObsidiaShell..."

# Vérifier que .env est configuré
if grep -q "sk-your-openai-api-key-here" .env; then
    echo "⚠ ATTENTION: Veuillez configurer votre clé OpenAI dans le fichier .env"
    echo "Éditer .env et remplacer 'sk-your-openai-api-key-here' par votre vraie clé"
    exit 1
fi

# Build et lancement
docker-compose -f docker-compose.unified.yml up -d --build

echo ""
echo "✓ ObsidiaShell démarré !"
echo ""
echo "📊 Services disponibles:"
echo "  - API Gateway:       http://localhost:8000"
echo "  - Health Check:      http://localhost:8000/health"
echo "  - FastGPT Dashboard: http://localhost:3001"
echo "  - Onyx Frontend:     http://localhost:3002"
echo "  - Grafana:           http://localhost:3003 (admin/obsidia2024)"
echo "  - Neo4j Browser:     http://localhost:7474 (neo4j/obsidia2024)"
echo ""
echo "📋 Vérifier les logs:"
echo "  docker-compose -f docker-compose.unified.yml logs -f"
echo ""
echo "🛑 Arrêter:"
echo "  docker-compose -f docker-compose.unified.yml down"
echo ""
EOF

chmod +x start.sh

cat > stop.sh << 'EOF'
#!/bin/bash
# stop.sh - Arrêter ObsidiaShell

echo "🛑 Arrêt d'ObsidiaShell..."
docker-compose -f docker-compose.unified.yml down
echo "✓ ObsidiaShell arrêté"
EOF

chmod +x stop.sh

echo -e "${GREEN}✓ Scripts de lancement créés${NC}"

# ============================================================================
# RÉSUMÉ FINAL
# ============================================================================

echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✓ Installation terminée avec succès !          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}📂 Structure créée:${NC}"
echo "   ObsidiaShell/"
echo "   ├── apps/ (Graphiti, FastGPT, Danswer)"
echo "   ├── obsidia_data/ (vos données)"
echo "   ├── obsidia_config/ (configs)"
echo "   ├── obsidia_core/ (pipelines)"
echo "   └── monitoring/ (Prometheus, Grafana)"
echo ""

echo -e "${YELLOW}⚠ PROCHAINES ÉTAPES:${NC}"
echo ""
echo -e "${YELLOW}1.${NC} Copier les fichiers générés dans les bons dossiers:"
echo "   - agent_bridge.py → obsidia_core/"
echo "   - unify_config.yaml → obsidia_config/"
echo "   - docker-compose.unified.yml → racine"
echo "   - ingest.py, classify.py, index.py, unify.py → obsidia_core/"
echo ""

echo -e "${YELLOW}2.${NC} Configurer votre clé OpenAI:"
echo "   nano .env"
echo "   (Remplacer 'sk-your-openai-api-key-here')"
echo ""

echo -e "${YELLOW}3.${NC} Lancer ObsidiaShell:"
echo "   ./start.sh"
echo ""

echo -e "${YELLOW}4.${NC} Vérifier que tout fonctionne:"
echo "   curl http://localhost:8000/health"
echo ""

echo -e "${BLUE}📚 Documentation:${NC}"
echo "   README.md - Guide complet"
echo "   QUICKSTART.md - Démarrage rapide"
echo ""

echo -e "${GREEN}🎯 Votre laboratoire AGI est prêt !${NC}\n"
