// ObsidiaShell Dashboard - Main Application Logic

// Configuration
const CONFIG = {
  gatewayUrl: 'http://localhost:8000',
  services: {
    graphiti: { name: 'Graphiti', port: 8001, description: 'Graph Intelligence' },
    fastgpt: { name: 'FastGPT', port: 3000, description: 'LLM & Classification' },
    danswer: { name: 'Danswer', port: 8080, description: 'RAG Search' }
  },
  domains: [
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
  ],
  lots: ['maps_first', 'lot_A_ancien', 'lot_B_intermediaire', 'lot_C_recent'],
  fileFormats: ['pdf', 'docx', 'md', 'txt']
};

// Application State (in-memory, no localStorage)
const appState = {
  currentPage: 'dashboard',
  theme: 'light',
  selectedFiles: [],
  selectedDomains: [],
  selectedLot: 'maps_first',
  serviceHealth: {
    graphiti: 'checking',
    fastgpt: 'checking',
    danswer: 'checking'
  },
  pipelineStatus: 'idle',
  chatHistory: [],
  searchResults: [],
  exportHistory: []
};

// Utility Functions
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? 'fa-check-circle' : 
               type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
  
  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function addActivityLog(message, icon = 'fa-info-circle') {
  const activityLog = document.getElementById('activity-log');
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
    <time>À l'instant</time>
  `;
  activityLog.insertBefore(item, activityLog.firstChild);
  
  // Keep only last 10 items
  while (activityLog.children.length > 10) {
    activityLog.removeChild(activityLog.lastChild);
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const pageName = item.getAttribute('data-page');
      navigateToPage(pageName);
    });
  });
  
  // Handle initial hash navigation
  const hash = window.location.hash.substring(1);
  if (hash) {
    navigateToPage(hash);
  }
}

function navigateToPage(pageName) {
  // Update state
  appState.currentPage = pageName;
  
  // Update URL hash
  window.location.hash = pageName;
  
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-page') === pageName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Show/hide pages
  document.querySelectorAll('.page').forEach(page => {
    if (page.id === `page-${pageName}`) {
      page.style.display = 'block';
    } else {
      page.style.display = 'none';
    }
  });
  
  // Load page-specific content
  loadPageContent(pageName);
  
  // Close mobile menu if open
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.remove('open');
  
  addActivityLog(`Navigation vers ${pageName}`, 'fa-arrow-right');
}

function loadPageContent(pageName) {
  switch(pageName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'ingestion':
      loadIngestion();
      break;
    case 'domaines':
      loadDomaines();
      break;
    case 'pipeline':
      loadPipeline();
      break;
    case 'graphiti':
      loadGraphiti();
      break;
    case 'fastgpt':
      loadFastGPT();
      break;
    case 'danswer':
      loadDanswer();
      break;
    case 'export':
      loadExport();
      break;
  }
}

// Theme Toggle
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  
  themeToggle.addEventListener('click', () => {
    appState.theme = appState.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-color-scheme', appState.theme);
    
    const icon = themeToggle.querySelector('i');
    icon.className = appState.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  });
  
  // Set initial theme based on system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    appState.theme = 'dark';
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    themeToggle.querySelector('i').className = 'fas fa-sun';
  }
}

// Mobile Menu
function initMobileMenu() {
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
}

// Service Health Check
async function checkServiceHealth() {
  const services = ['graphiti', 'fastgpt', 'danswer'];
  
  for (const service of services) {
    const statusElement = document.getElementById(`status-${service}`);
    const healthElement = document.getElementById(`health-${service}`);
    
    try {
      const response = await fetchWithRetry(`${CONFIG.gatewayUrl}/health`, {}, 1);
      const data = await response.json();
      
      appState.serviceHealth[service] = 'online';
      statusElement.classList.add('online');
      
      if (healthElement) {
        const statusBadge = healthElement.querySelector('.status');
        statusBadge.className = 'status status--success';
        statusBadge.textContent = 'En ligne';
      }
    } catch (error) {
      appState.serviceHealth[service] = 'offline';
      statusElement.classList.add('offline');
      
      if (healthElement) {
        const statusBadge = healthElement.querySelector('.status');
        statusBadge.className = 'status status--error';
        statusBadge.textContent = 'Hors ligne';
      }
    }
  }
  
  updateServiceStats();
}

function updateServiceStats() {
  const onlineCount = Object.values(appState.serviceHealth).filter(s => s === 'online').length;
  const statStatus = document.getElementById('stat-status');
  if (statStatus) {
    statStatus.textContent = `${onlineCount}/3`;
  }
}

// Dashboard Page
function loadDashboard() {
  checkServiceHealth();
  updateDashboardStats();
  addActivityLog('Dashboard chargé', 'fa-chart-line');
}

function updateDashboardStats() {
  // Simulate some stats
  document.getElementById('stat-documents').textContent = Math.floor(Math.random() * 500 + 100);
  document.getElementById('stat-nodes').textContent = Math.floor(Math.random() * 1000 + 200);
}

// Ingestion Page
function loadIngestion() {
  const domainSelector = document.getElementById('domain-selector');
  domainSelector.innerHTML = '';
  
  CONFIG.domains.forEach((domain, index) => {
    const label = document.createElement('label');
    label.className = 'domain-checkbox';
    label.innerHTML = `
      <input type="checkbox" value="${domain}" data-index="${index}">
      <span>${domain}</span>
    `;
    domainSelector.appendChild(label);
  });
  
  // Upload zone
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  
  uploadZone.addEventListener('click', () => fileInput.click());
  
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--color-primary)';
  });
  
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = '';
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    handleFiles(e.dataTransfer.files);
  });
  
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });
  
  // Domain selection
  domainSelector.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      updateSelectedDomains();
    }
  });
  
  // Upload button
  uploadBtn.addEventListener('click', () => {
    startIngestion();
  });
}

function handleFiles(files) {
  appState.selectedFiles = Array.from(files);
  displayFileList();
  updateUploadButton();
}

function displayFileList() {
  const fileList = document.getElementById('file-list');
  fileList.innerHTML = '';
  
  appState.selectedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-info">
        <i class="fas fa-file"></i>
        <span>${file.name}</span>
        <small>(${(file.size / 1024).toFixed(2)} KB)</small>
      </div>
      <button class="btn btn--outline btn--sm" onclick="removeFile(${index})">
        <i class="fas fa-times"></i>
      </button>
    `;
    fileList.appendChild(item);
  });
}

function removeFile(index) {
  appState.selectedFiles.splice(index, 1);
  displayFileList();
  updateUploadButton();
}

function updateSelectedDomains() {
  const checkboxes = document.querySelectorAll('#domain-selector input:checked');
  appState.selectedDomains = Array.from(checkboxes).map(cb => cb.value);
  updateUploadButton();
}

function updateUploadButton() {
  const uploadBtn = document.getElementById('upload-btn');
  uploadBtn.disabled = appState.selectedFiles.length === 0 || appState.selectedDomains.length === 0;
}

async function startIngestion() {
  const lot = document.getElementById('lot-select').value;
  
  showToast(`Démarrage de l'ingestion de ${appState.selectedFiles.length} fichiers...`, 'info');
  addActivityLog(`Ingestion démarrée: ${appState.selectedFiles.length} fichiers`, 'fa-upload');
  
  try {
    const formData = new FormData();
    appState.selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('lot', lot);
    formData.append('domains', JSON.stringify(appState.selectedDomains));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    showToast('Ingestion terminée avec succès!', 'success');
    addActivityLog('Ingestion réussie', 'fa-check-circle');
    
    // Reset
    appState.selectedFiles = [];
    appState.selectedDomains = [];
    displayFileList();
    document.querySelectorAll('#domain-selector input').forEach(cb => cb.checked = false);
    updateUploadButton();
    
  } catch (error) {
    showToast(`Erreur d'ingestion: ${error.message}`, 'error');
    addActivityLog('Erreur d\'ingestion', 'fa-exclamation-circle');
  }
}

// Domaines Page
function loadDomaines() {
  const domainsGrid = document.getElementById('domains-grid');
  domainsGrid.innerHTML = '';
  
  CONFIG.domains.forEach(domain => {
    const card = document.createElement('div');
    card.className = 'domain-card';
    card.innerHTML = `
      <h3>${domain}</h3>
      <div class="domain-stats">
        <div><i class="fas fa-file"></i> ${Math.floor(Math.random() * 50)} documents</div>
        <div><i class="fas fa-tag"></i> ${Math.floor(Math.random() * 20)} tags</div>
        <div><i class="fas fa-project-diagram"></i> ${Math.floor(Math.random() * 100)} relations</div>
      </div>
    `;
    domainsGrid.appendChild(card);
  });
  
  // Search functionality
  const searchInput = document.getElementById('domain-search');
  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.domain-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(query) ? 'block' : 'none';
    });
  }, 300));
}

// Pipeline Page
function loadPipeline() {
  const startBtn = document.getElementById('pipeline-start');
  const pauseBtn = document.getElementById('pipeline-pause');
  const stopBtn = document.getElementById('pipeline-stop');
  
  startBtn.addEventListener('click', () => startPipeline());
  pauseBtn.addEventListener('click', () => pausePipeline());
  stopBtn.addEventListener('click', () => stopPipeline());
}

function startPipeline() {
  appState.pipelineStatus = 'running';
  showToast('Pipeline démarré', 'success');
  addActivityLog('Pipeline démarré', 'fa-play');
  
  const steps = ['ingest', 'classify', 'index', 'graph'];
  let currentStep = 0;
  
  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      const stepElement = document.getElementById(`step-${steps[currentStep]}`);
      stepElement.classList.add('active');
      
      const statusBadge = stepElement.querySelector('.status');
      statusBadge.className = 'status status--success';
      statusBadge.textContent = 'Terminé';
      
      addPipelineLog(`Étape ${steps[currentStep]} terminée`);
      currentStep++;
    } else {
      clearInterval(interval);
      appState.pipelineStatus = 'idle';
      showToast('Pipeline terminé', 'success');
    }
  }, 2000);
}

function pausePipeline() {
  appState.pipelineStatus = 'paused';
  showToast('Pipeline en pause', 'info');
  addPipelineLog('Pipeline mis en pause');
}

function stopPipeline() {
  appState.pipelineStatus = 'idle';
  showToast('Pipeline arrêté', 'info');
  addPipelineLog('Pipeline arrêté');
  
  // Reset steps
  document.querySelectorAll('.pipeline-step').forEach(step => {
    step.classList.remove('active');
    const statusBadge = step.querySelector('.status');
    statusBadge.className = 'status status--info';
    statusBadge.textContent = 'En attente';
  });
}

function addPipelineLog(message) {
  const logsContainer = document.getElementById('pipeline-logs');
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logsContainer.appendChild(entry);
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Graphiti Page
function loadGraphiti() {
  populateDomainFilter('graph-domain-filter');
  
  const refreshBtn = document.getElementById('graph-refresh');
  refreshBtn.addEventListener('click', () => {
    showToast('Actualisation du graphe...', 'info');
    loadGraphData();
  });
  
  loadGraphData();
}

function loadGraphData() {
  // Simulate graph data
  document.getElementById('graph-nodes-count').textContent = Math.floor(Math.random() * 500 + 100);
  document.getElementById('graph-edges-count').textContent = Math.floor(Math.random() * 1000 + 200);
  document.getElementById('graph-clusters-count').textContent = Math.floor(Math.random() * 20 + 5);
  
  const container = document.getElementById('graph-container');
  container.innerHTML = '<div class="graph-placeholder"><i class="fas fa-project-diagram"></i><p>Graphe de connaissances<br>Données simulées</p></div>';
}

// FastGPT Page
function loadFastGPT() {
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const classifyInput = document.getElementById('classify-input');
  const classifyBtn = document.getElementById('classify-btn');
  
  chatSend.addEventListener('click', () => sendChatMessage());
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
  
  classifyBtn.addEventListener('click', () => classifyText());
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  const chatMessages = document.getElementById('chat-messages');
  
  // User message
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-message user';
  userMsg.innerHTML = `
    <i class="fas fa-user"></i>
    <div class="message-content">
      <p>${message}</p>
    </div>
  `;
  chatMessages.appendChild(userMsg);
  
  input.value = '';
  
  // Simulate assistant response
  setTimeout(() => {
    const assistantMsg = document.createElement('div');
    assistantMsg.className = 'chat-message assistant';
    assistantMsg.innerHTML = `
      <i class="fas fa-robot"></i>
      <div class="message-content">
        <p>Réponse simulée: J'ai bien reçu votre message "${message}". En production, cette réponse viendrait du modèle FastGPT.</p>
      </div>
    `;
    chatMessages.appendChild(assistantMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 1000);
}

function classifyText() {
  const input = document.getElementById('classify-input');
  const text = input.value.trim();
  
  if (!text) {
    showToast('Veuillez entrer du texte à classifier', 'error');
    return;
  }
  
  const resultsContainer = document.getElementById('classify-results');
  resultsContainer.innerHTML = '<p>Classification en cours...</p>';
  
  // Simulate classification
  setTimeout(() => {
    const randomDomains = CONFIG.domains
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    resultsContainer.innerHTML = `
      <h4>Domaines détectés:</h4>
      <div>
        ${randomDomains.map(domain => `<span class="classify-tag">${domain}</span>`).join('')}
      </div>
    `;
    
    showToast('Classification terminée', 'success');
  }, 1500);
}

// Danswer Page
function loadDanswer() {
  populateDomainFilter('rag-domain-filter');
  
  const searchBtn = document.getElementById('rag-search-btn');
  const searchInput = document.getElementById('rag-search');
  
  searchBtn.addEventListener('click', () => performRAGSearch());
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performRAGSearch();
    }
  });
}

function performRAGSearch() {
  const query = document.getElementById('rag-search').value.trim();
  
  if (!query) {
    showToast('Veuillez entrer une requête', 'error');
    return;
  }
  
  const resultsContainer = document.getElementById('search-results');
  resultsContainer.innerHTML = '<p>Recherche en cours...</p>';
  
  // Simulate search
  setTimeout(() => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push({
        title: `Document ${i + 1}: Résultat pour "${query}"`,
        snippet: `Ceci est un extrait pertinent du document qui contient des informations sur ${query}. Le système RAG a trouvé cette correspondance sémantique...`,
        domain: CONFIG.domains[Math.floor(Math.random() * CONFIG.domains.length)],
        score: (Math.random() * 0.3 + 0.7).toFixed(2)
      });
    }
    
    resultsContainer.innerHTML = results.map(result => `
      <div class="search-result">
        <h4>${result.title}</h4>
        <p class="result-snippet">${result.snippet}</p>
        <div class="result-meta">
          <span><i class="fas fa-layer-group"></i> ${result.domain}</span>
          <span><i class="fas fa-chart-bar"></i> Score: ${result.score}</span>
        </div>
      </div>
    `).join('');
    
    showToast(`${results.length} résultats trouvés`, 'success');
  }, 1500);
}

// Export Page
function loadExport() {
  populateDomainFilter('export-domain');
  
  const previewBtn = document.getElementById('export-preview-btn');
  const downloadBtn = document.getElementById('export-download-btn');
  
  previewBtn.addEventListener('click', () => generateExportPreview());
  downloadBtn.addEventListener('click', () => downloadExport());
}

function generateExportPreview() {
  const format = document.getElementById('export-format').value;
  const domain = document.getElementById('export-domain').value;
  const lot = document.getElementById('export-lot').value;
  
  const previewContent = document.getElementById('export-preview-content');
  
  const sampleData = {
    format: format,
    filters: {
      domain: domain || 'Tous',
      lot: lot || 'Tous'
    },
    documents: [
      { id: 1, title: 'Document 1', domain: 'Cognition vivante' },
      { id: 2, title: 'Document 2', domain: 'Éthique / gouvernance' }
    ],
    exportDate: new Date().toISOString()
  };
  
  if (format === 'json') {
    previewContent.textContent = JSON.stringify(sampleData, null, 2);
  } else if (format === 'csv') {
    previewContent.textContent = 'id,title,domain\n1,"Document 1","Cognition vivante"\n2,"Document 2","Éthique / gouvernance"';
  } else if (format === 'markdown') {
    previewContent.textContent = '# Export ObsidiaShell\n\n## Documents\n\n- Document 1 (Cognition vivante)\n- Document 2 (Éthique / gouvernance)';
  } else {
    previewContent.textContent = 'Aperçu PDF non disponible en mode prévisualisation';
  }
  
  showToast('Aperçu généré', 'success');
}

function downloadExport() {
  const format = document.getElementById('export-format').value;
  showToast(`Export ${format.toUpperCase()} en cours...`, 'info');
  
  setTimeout(() => {
    showToast('Export téléchargé avec succès!', 'success');
    addExportToHistory(format);
  }, 1000);
}

function addExportToHistory(format) {
  const history = document.getElementById('export-history');
  const item = document.createElement('div');
  item.className = 'activity-item';
  item.innerHTML = `
    <i class="fas fa-file-download"></i>
    <span>Export ${format.toUpperCase()}</span>
    <time>À l'instant</time>
  `;
  
  if (history.querySelector('.text-muted')) {
    history.innerHTML = '';
  }
  
  history.insertBefore(item, history.firstChild);
}

// Helper: Populate domain filters
function populateDomainFilter(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  // Clear existing options except the first one
  while (select.options.length > 1) {
    select.remove(1);
  }
  
  CONFIG.domains.forEach(domain => {
    const option = document.createElement('option');
    option.value = domain;
    option.textContent = domain;
    select.appendChild(option);
  });
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTheme();
  initMobileMenu();
  
  // Check service health every 30 seconds
  checkServiceHealth();
  setInterval(checkServiceHealth, 30000);
  
  // Load initial page
  const hash = window.location.hash.substring(1) || 'dashboard';
  navigateToPage(hash);
  
  showToast('ObsidiaShell initialisé avec succès', 'success');
});

// Make removeFile available globally
window.removeFile = removeFile;