# classify.py + index.py + unify.py - Pipelines Complémentaires

## classify.py - Pipeline de Classification

```python
"""
ObsidiaShell Classification Pipeline
Classifie automatiquement les documents selon les 24 domaines Obsidia
"""

import asyncio
import logging
from pathlib import Path
from typing import List, Dict
import yaml
import httpx

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

with open('../obsidia_config/unify_config.yaml', 'r') as f:
    CONFIG = yaml.safe_load(f)

GATEWAY_URL = "http://localhost:8000"

class Classifier:
    """Classification automatique via FastGPT"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.domains = [d['name'] for d in CONFIG['domains']['list']]
    
    async def classify_document(self, doc_id: str, content: str) -> List[str]:
        """Classifier un document avec FastGPT"""
        try:
            response = await self.client.post(
                f"{GATEWAY_URL}/llm/classify",
                json={
                    "document_id": doc_id,
                    "content": content[:4000],  # Limiter la taille
                    "domains": self.domains,
                    "confidence_threshold": CONFIG['llm']['classification']['confidence_threshold']
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                classified_domains = data.get('domains', [])
                logger.info(f"✓ Classified: {doc_id} → {', '.join(classified_domains)}")
                return classified_domains
            else:
                logger.error(f"✗ Classification failed: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"✗ Classification error: {e}")
            return []
    
    async def reclassify_all(self):
        """Reclassifier tous les documents existants"""
        logger.info("🔄 Starting reclassification of all documents...")
        
        # Récupérer la liste des documents depuis Danswer
        response = await self.client.get(f"{GATEWAY_URL}/search/documents/list")
        
        if response.status_code == 200:
            documents = response.json().get('documents', [])
            logger.info(f"📂 Found {len(documents)} documents to reclassify")
            
            for doc in documents:
                await self.classify_document(doc['id'], doc['content'])
        
        logger.info("✓ Reclassification complete")
    
    async def close(self):
        await self.client.aclose()

async def main():
    classifier = Classifier()
    try:
        await classifier.reclassify_all()
    finally:
        await classifier.close()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## index.py - Pipeline d'Indexation

```python
"""
ObsidiaShell Indexation Pipeline
Indexe et réindexe les documents dans Elasticsearch via Danswer
"""

import asyncio
import logging
import httpx
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GATEWAY_URL = "http://localhost:8000"

class Indexer:
    """Indexation et réindexation des documents"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def reindex_all(self):
        """Réindexer tous les documents"""
        logger.info("🔄 Starting full reindexation...")
        
        try:
            response = await self.client.post(
                f"{GATEWAY_URL}/search/reindex",
                json={
                    "full_reindex": True,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Reindexation complete: {data.get('documents_indexed')} docs")
            else:
                logger.error(f"✗ Reindexation failed: {response.status_code}")
                
        except Exception as e:
            logger.error(f"✗ Reindexation error: {e}")
    
    async def index_by_domain(self, domain: str):
        """Indexer les documents d'un domaine spécifique"""
        logger.info(f"🔄 Indexing domain: {domain}")
        
        try:
            response = await self.client.post(
                f"{GATEWAY_URL}/search/index/domain",
                json={"domain": domain}
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Domain indexed: {data.get('documents_indexed')} docs")
            else:
                logger.error(f"✗ Domain indexation failed")
                
        except Exception as e:
            logger.error(f"✗ Indexation error: {e}")
    
    async def optimize_index(self):
        """Optimiser les index Elasticsearch"""
        logger.info("⚡ Optimizing search index...")
        
        try:
            response = await self.client.post(
                f"{GATEWAY_URL}/search/optimize"
            )
            
            if response.status_code == 200:
                logger.info("✓ Index optimization complete")
            else:
                logger.error("✗ Optimization failed")
                
        except Exception as e:
            logger.error(f"✗ Optimization error: {e}")
    
    async def close(self):
        await self.client.aclose()

async def main():
    indexer = Indexer()
    try:
        await indexer.reindex_all()
        await indexer.optimize_index()
    finally:
        await indexer.close()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## unify.py - Pipeline de Synchronisation

```python
"""
ObsidiaShell Unification Pipeline
Synchronise les données entre Graphiti, FastGPT et Danswer
"""

import asyncio
import logging
from typing import Dict, List, Set
import httpx
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GATEWAY_URL = "http://localhost:8000"

class Unifier:
    """Synchronisation et unification des trois services"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def get_document_ids(self, service: str) -> Set[str]:
        """Récupérer la liste des IDs de documents d'un service"""
        try:
            endpoints = {
                'graphiti': f"{GATEWAY_URL}/graph/documents/ids",
                'fastgpt': f"{GATEWAY_URL}/llm/documents/ids",
                'danswer': f"{GATEWAY_URL}/search/documents/ids"
            }
            
            response = await self.client.get(endpoints[service])
            
            if response.status_code == 200:
                data = response.json()
                return set(data.get('document_ids', []))
            else:
                logger.error(f"✗ Failed to get IDs from {service}")
                return set()
                
        except Exception as e:
            logger.error(f"✗ Error getting IDs from {service}: {e}")
            return set()
    
    async def find_missing_documents(self) -> Dict[str, List[str]]:
        """Trouver les documents manquants dans chaque service"""
        logger.info("🔍 Checking for missing documents across services...")
        
        # Récupérer les IDs de chaque service
        graphiti_ids = await self.get_document_ids('graphiti')
        fastgpt_ids = await self.get_document_ids('fastgpt')
        danswer_ids = await self.get_document_ids('danswer')
        
        # Trouver l'ensemble complet (union)
        all_ids = graphiti_ids | fastgpt_ids | danswer_ids
        
        # Trouver les manquants
        missing = {
            'graphiti': list(all_ids - graphiti_ids),
            'fastgpt': list(all_ids - fastgpt_ids),
            'danswer': list(all_ids - danswer_ids)
        }
        
        # Afficher le résumé
        logger.info(f"\n📊 Synchronization Status:")
        logger.info(f"   Graphiti: {len(graphiti_ids)} docs ({len(missing['graphiti'])} missing)")
        logger.info(f"   FastGPT:  {len(fastgpt_ids)} docs ({len(missing['fastgpt'])} missing)")
        logger.info(f"   Danswer:  {len(danswer_ids)} docs ({len(missing['danswer'])} missing)")
        logger.info(f"   Total unique: {len(all_ids)} docs\n")
        
        return missing
    
    async def sync_missing_documents(self):
        """Synchroniser les documents manquants"""
        missing = await self.find_missing_documents()
        
        total_missing = sum(len(docs) for docs in missing.values())
        
        if total_missing == 0:
            logger.info("✓ All services are synchronized!")
            return
        
        logger.info(f"🔄 Synchronizing {total_missing} missing documents...\n")
        
        # Pour chaque service, récupérer et réinjecter les documents manquants
        for service, doc_ids in missing.items():
            if doc_ids:
                logger.info(f"📤 Syncing {len(doc_ids)} docs to {service}...")
                
                for doc_id in doc_ids:
                    await self.sync_single_document(doc_id, service)
        
        logger.info("\n✓ Synchronization complete!")
    
    async def sync_single_document(self, doc_id: str, target_service: str):
        """Synchroniser un document vers un service cible"""
        try:
            # Récupérer le document depuis Danswer (source de vérité)
            response = await self.client.get(
                f"{GATEWAY_URL}/search/documents/{doc_id}"
            )
            
            if response.status_code != 200:
                logger.error(f"✗ Failed to retrieve doc {doc_id}")
                return
            
            doc_data = response.json()
            
            # Envoyer vers le service cible
            endpoints = {
                'graphiti': f"{GATEWAY_URL}/graph/add",
                'fastgpt': f"{GATEWAY_URL}/llm/vector/upsert",
                'danswer': f"{GATEWAY_URL}/search/ingestion/push"
            }
            
            response = await self.client.post(
                endpoints[target_service],
                json=doc_data
            )
            
            if response.status_code == 200:
                logger.info(f"  ✓ Synced {doc_id} to {target_service}")
            else:
                logger.error(f"  ✗ Failed to sync {doc_id} to {target_service}")
                
        except Exception as e:
            logger.error(f"  ✗ Sync error for {doc_id}: {e}")
    
    async def health_check(self):
        """Vérifier la santé de tous les services"""
        logger.info("🏥 Running health check...\n")
        
        try:
            response = await self.client.get(f"{GATEWAY_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                
                logger.info(f"Gateway Status: {data['status']}")
                logger.info(f"Timestamp: {data['timestamp']}\n")
                
                for service, status in data['services'].items():
                    icon = "✓" if status == "healthy" else "✗"
                    logger.info(f"  {icon} {service.capitalize()}: {status}")
                
                logger.info("")
                return data['status'] == 'healthy'
            else:
                logger.error("✗ Health check failed")
                return False
                
        except Exception as e:
            logger.error(f"✗ Health check error: {e}")
            return False
    
    async def close(self):
        await self.client.aclose()

async def main():
    unifier = Unifier()
    
    try:
        # 1. Vérifier la santé
        healthy = await unifier.health_check()
        
        if not healthy:
            logger.error("⚠ Services not healthy, aborting sync")
            return
        
        # 2. Synchroniser les documents manquants
        await unifier.sync_missing_documents()
        
    finally:
        await unifier.close()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Utilisation

```bash
# Pipeline d'ingestion
python obsidia_core/ingest.py

# Reclassification
python obsidia_core/classify.py

# Réindexation
python obsidia_core/index.py

# Synchronisation
python obsidia_core/unify.py
```
