# ingest.py - Pipeline d'Ingestion Unifié ObsidiaShell

```python
"""
ObsidiaShell Unified Ingestion Pipeline
Ingère les documents et les envoie vers Graphiti, FastGPT et Danswer
"""

import os
import json
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import yaml
import httpx
from datetime import datetime
import hashlib
import mimetypes

# Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Charger la config
with open('../obsidia_config/unify_config.yaml', 'r') as f:
    CONFIG = yaml.safe_load(f)

# URLs des services
GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:8000")
GRAPHITI_URL = f"{GATEWAY_URL}/graph"
FASTGPT_URL = f"{GATEWAY_URL}/llm"
DANSWER_URL = f"{GATEWAY_URL}/search"

# Ordre d'ingestion selon la config
INGESTION_ORDER = CONFIG['pipeline']['ingestion_order']

class DocumentProcessor:
    """Processeur de documents pour l'ingestion unifiée"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.processed_docs = set()
        self.stats = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'skipped': 0
        }
    
    async def close(self):
        """Fermer le client HTTP"""
        await self.client.aclose()
    
    def get_file_hash(self, filepath: Path) -> str:
        """Calculer le hash SHA256 d'un fichier"""
        sha256 = hashlib.sha256()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def extract_text(self, filepath: Path) -> Optional[str]:
        """Extraire le texte d'un fichier selon son type"""
        mime_type, _ = mimetypes.guess_type(str(filepath))
        
        try:
            # Fichiers texte
            if mime_type and mime_type.startswith('text'):
                with open(filepath, 'r', encoding='utf-8') as f:
                    return f.read()
            
            # PDF
            elif filepath.suffix == '.pdf':
                try:
                    import PyPDF2
                    with open(filepath, 'rb') as f:
                        reader = PyPDF2.PdfReader(f)
                        text = ""
                        for page in reader.pages:
                            text += page.extract_text()
                        return text
                except ImportError:
                    logger.warning("PyPDF2 not installed, skipping PDF")
                    return None
            
            # DOCX
            elif filepath.suffix == '.docx':
                try:
                    import docx
                    doc = docx.Document(filepath)
                    return '\n'.join([para.text for para in doc.paragraphs])
                except ImportError:
                    logger.warning("python-docx not installed, skipping DOCX")
                    return None
            
            # Markdown
            elif filepath.suffix == '.md':
                with open(filepath, 'r', encoding='utf-8') as f:
                    return f.read()
            
            else:
                logger.warning(f"Unsupported file type: {mime_type} for {filepath}")
                return None
                
        except Exception as e:
            logger.error(f"Error extracting text from {filepath}: {e}")
            return None
    
    def classify_domain(self, text: str, filename: str) -> List[str]:
        """Classifier le document selon les domaines Obsidia"""
        domains = []
        domain_list = CONFIG['domains']['list']
        
        text_lower = text.lower()
        filename_lower = filename.lower()
        
        for domain_info in domain_list:
            domain_name = domain_info['name']
            keywords = domain_info['keywords']
            
            # Vérifier si un mot-clé apparaît
            for keyword in keywords:
                if keyword.lower() in text_lower or keyword.lower() in filename_lower:
                    domains.append(domain_name)
                    break
        
        # Si aucun domaine trouvé, mettre "Non classifié"
        if not domains:
            domains = ["Non classifié"]
        
        return domains
    
    async def send_to_graphiti(self, doc_data: Dict[str, Any]) -> bool:
        """Envoyer le document à Graphiti pour création du graphe"""
        try:
            payload = {
                "document_id": doc_data['id'],
                "content": doc_data['content'][:5000],  # Limiter pour le graphe
                "metadata": {
                    "filename": doc_data['filename'],
                    "domains": doc_data['domains'],
                    "lot": doc_data['lot'],
                    "timestamp": doc_data['timestamp']
                }
            }
            
            response = await self.client.post(
                f"{GRAPHITI_URL}/add",
                json=payload
            )
            
            if response.status_code == 200:
                logger.info(f"✓ Graphiti: {doc_data['filename']}")
                return True
            else:
                logger.error(f"✗ Graphiti error {response.status_code}: {doc_data['filename']}")
                return False
                
        except Exception as e:
            logger.error(f"✗ Graphiti exception for {doc_data['filename']}: {e}")
            return False
    
    async def send_to_fastgpt(self, doc_data: Dict[str, Any]) -> bool:
        """Envoyer le document à FastGPT pour embedding et classification"""
        try:
            payload = {
                "document_id": doc_data['id'],
                "content": doc_data['content'],
                "metadata": {
                    "filename": doc_data['filename'],
                    "domains": doc_data['domains'],
                    "lot": doc_data['lot'],
                    "timestamp": doc_data['timestamp']
                },
                "auto_classify": True
            }
            
            response = await self.client.post(
                f"{FASTGPT_URL}/vector/upsert",
                json=payload
            )
            
            if response.status_code == 200:
                logger.info(f"✓ FastGPT: {doc_data['filename']}")
                return True
            else:
                logger.error(f"✗ FastGPT error {response.status_code}: {doc_data['filename']}")
                return False
                
        except Exception as e:
            logger.error(f"✗ FastGPT exception for {doc_data['filename']}: {e}")
            return False
    
    async def send_to_danswer(self, doc_data: Dict[str, Any]) -> bool:
        """Envoyer le document à Danswer pour indexation RAG"""
        try:
            payload = {
                "document_id": doc_data['id'],
                "content": doc_data['content'],
                "metadata": {
                    "filename": doc_data['filename'],
                    "domains": doc_data['domains'],
                    "lot": doc_data['lot'],
                    "timestamp": doc_data['timestamp'],
                    "file_hash": doc_data['hash']
                },
                "chunk_config": {
                    "chunk_size": CONFIG['rag']['ingestion']['chunk_size'],
                    "chunk_overlap": CONFIG['rag']['ingestion']['chunk_overlap']
                }
            }
            
            response = await self.client.post(
                f"{DANSWER_URL}/ingestion/push",
                json=payload
            )
            
            if response.status_code == 200:
                logger.info(f"✓ Danswer: {doc_data['filename']}")
                return True
            else:
                logger.error(f"✗ Danswer error {response.status_code}: {doc_data['filename']}")
                return False
                
        except Exception as e:
            logger.error(f"✗ Danswer exception for {doc_data['filename']}: {e}")
            return False
    
    async def ingest_document(self, filepath: Path, lot: str) -> bool:
        """Ingérer un document vers les 3 services en parallèle"""
        
        # Vérifier si déjà traité
        file_hash = self.get_file_hash(filepath)
        if file_hash in self.processed_docs:
            logger.info(f"⊘ Skipped (already processed): {filepath.name}")
            self.stats['skipped'] += 1
            return True
        
        # Extraire le texte
        content = self.extract_text(filepath)
        if not content:
            logger.warning(f"⊘ Skipped (no content): {filepath.name}")
            self.stats['skipped'] += 1
            return False
        
        # Classifier
        domains = self.classify_domain(content, filepath.name)
        
        # Préparer les données
        doc_data = {
            'id': file_hash,
            'hash': file_hash,
            'filename': filepath.name,
            'filepath': str(filepath),
            'content': content,
            'domains': domains,
            'lot': lot,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info(f"\n📄 Processing: {filepath.name}")
        logger.info(f"   Lot: {lot}")
        logger.info(f"   Domains: {', '.join(domains)}")
        logger.info(f"   Size: {len(content)} chars")
        
        # Envoyer vers les 3 services en parallèle
        results = await asyncio.gather(
            self.send_to_graphiti(doc_data),
            self.send_to_fastgpt(doc_data),
            self.send_to_danswer(doc_data),
            return_exceptions=True
        )
        
        # Vérifier les résultats
        success = all(r is True for r in results if not isinstance(r, Exception))
        
        if success:
            self.processed_docs.add(file_hash)
            self.stats['success'] += 1
            logger.info(f"✓ SUCCESS: {filepath.name}\n")
        else:
            self.stats['failed'] += 1
            logger.error(f"✗ FAILED: {filepath.name}\n")
        
        self.stats['total'] += 1
        return success
    
    async def ingest_lot(self, lot_path: Path, lot_name: str):
        """Ingérer tous les fichiers d'un lot"""
        logger.info(f"\n{'='*60}")
        logger.info(f"🚀 Starting ingestion: {lot_name}")
        logger.info(f"{'='*60}\n")
        
        if not lot_path.exists():
            logger.warning(f"⚠ Lot path not found: {lot_path}")
            return
        
        # Récupérer tous les fichiers
        files = []
        for ext in CONFIG['rag']['ingestion']['supported_formats']:
            files.extend(lot_path.rglob(f"*.{ext}"))
        
        logger.info(f"📂 Found {len(files)} files in {lot_name}\n")
        
        # Traiter chaque fichier
        for filepath in sorted(files):
            await self.ingest_document(filepath, lot_name)
        
        logger.info(f"\n{'='*60}")
        logger.info(f"✓ Completed: {lot_name}")
        logger.info(f"{'='*60}\n")
    
    def print_stats(self):
        """Afficher les statistiques finales"""
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 INGESTION STATISTICS")
        logger.info(f"{'='*60}")
        logger.info(f"Total documents: {self.stats['total']}")
        logger.info(f"✓ Success: {self.stats['success']}")
        logger.info(f"✗ Failed: {self.stats['failed']}")
        logger.info(f"⊘ Skipped: {self.stats['skipped']}")
        logger.info(f"{'='*60}\n")

async def main():
    """Pipeline d'ingestion principal"""
    
    # Initialiser le processeur
    processor = DocumentProcessor()
    
    try:
        # Chemin de base des données
        base_path = Path('../obsidia_data')
        
        # Traiter chaque lot dans l'ordre configuré
        for lot in INGESTION_ORDER:
            lot_path = base_path / lot
            await processor.ingest_lot(lot_path, lot)
        
        # Afficher les stats finales
        processor.print_stats()
        
    except KeyboardInterrupt:
        logger.info("\n⚠ Ingestion interrupted by user")
    
    except Exception as e:
        logger.error(f"\n✗ Fatal error: {e}")
        raise
    
    finally:
        await processor.close()

if __name__ == "__main__":
    asyncio.run(main())
```

## Dépendances requises (requirements.txt) :

```
httpx
pyyaml
PyPDF2
python-docx
```

## Installation :

```bash
pip install httpx pyyaml PyPDF2 python-docx
```
