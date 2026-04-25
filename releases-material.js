// Material Design Releases Manager
// Configuration
const CONFIG = {
  jsonUrl: 'https://raw.githubusercontent.com/Jibo-Revival-Group/Official-Endpoints/refs/heads/main/OpenJiboOS-Mirrors.json',
  fallbackUrl: 'exampleJSON.json', // Local fallback
  corsProxy: 'https://cors-anywhere.herokuapp.com/'
};

// Release type definitions
const RELEASE_TYPES = {
  'NT': { label: 'Nightly', color: '#9333ea', description: 'Development build' },
  'BF': { label: 'Bug Fix', color: '#059669', description: 'Bug fixes only' },
  'RC': { label: 'Recommended', color: '#0ea5e9', description: 'Stable release' },
  'RT': { label: 'Remote', color: '#f59e0b', description: 'For remote servers' },
  'NW': { label: 'New Features', color: '#10b981', description: 'New functionality' },
  'IP': { label: 'Improvements', color: '#3b82f6', description: 'Enhancements' },
  'RF': { label: 'Refactored', color: '#8b5cf6', description: 'Code refactoring' },
  'BC': { label: 'Breaking Change', color: '#ef4444', description: 'May break compatibility', warning: true }
};

class ReleasesManager {
  constructor() {
    this.mirrors = [];
    this.allReleases = [];
    this.filteredReleases = [];
    this.currentFilters = {
      type: 'OpenJiboOS',
      version: 'all',
      location: 'all'
    };
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadReleases();
  }

  setupEventListeners() {
    // Filter dropdowns
    const typeSelect = document.getElementById('type-select');
    const versionSelect = document.getElementById('version-select');
    const locationSelect = document.getElementById('location-select');
    const refreshBtn = document.getElementById('refresh-btn');
    const retryBtn = document.getElementById('retry-btn');

    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        this.currentFilters.type = e.target.value;
        this.updateVersionOptions();
        this.filterAndRender();
      });
    }

    if (versionSelect) {
      versionSelect.addEventListener('change', (e) => {
        this.currentFilters.version = e.target.value;
        this.filterAndRender();
      });
    }

    if (locationSelect) {
      locationSelect.addEventListener('change', (e) => {
        this.currentFilters.location = e.target.value;
        this.filterAndRender();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadReleases());
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.loadReleases());
    }
  }

  async loadReleases() {
    this.showLoading();

    try {
      // Try direct fetch first
      let response;
      try {
        response = await fetch(CONFIG.jsonUrl);
      } catch (e) {
        console.log('Direct fetch failed, trying CORS proxy...');
        response = await fetch(CONFIG.corsProxy + CONFIG.jsonUrl);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.processData(data);
      this.updateVersionOptions();
      this.filterAndRender();

    } catch (error) {
      console.error('Error loading releases:', error);
      
      // Try fallback to local example JSON
      try {
        console.log('Trying fallback to local example JSON...');
        const response = await fetch(CONFIG.fallbackUrl);
        const data = await response.json();
        this.processData(data);
        this.updateVersionOptions();
        this.filterAndRender();
      } catch (fallbackError) {
        this.showError(error.message);
      }
    }
  }

  processData(data) {
    this.mirrors = data.mirrors || [];
    this.releaseTypes = data.releaseTypes || RELEASE_TYPES;
    
    // Flatten all releases from all mirrors
    this.allReleases = [];
    this.mirrors.forEach(mirror => {
      if (mirror.releases && Array.isArray(mirror.releases)) {
        mirror.releases.forEach(release => {
          this.allReleases.push({
            ...release,
            mirrorId: mirror.id,
            mirrorName: mirror.name,
            mirrorLocation: mirror.location,
            mirrorType: mirror.type,
            mirrorBaseUrl: mirror.baseUrl
          });
        });
      }
    });

    // Sort by date (newest first)
    this.allReleases.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
  }

  updateVersionOptions() {
    const versionSelect = document.getElementById('version-select');
    if (!versionSelect) return;

    // Get unique versions for the selected type
    const typeReleases = this.currentFilters.type === 'all' 
      ? this.allReleases 
      : this.allReleases.filter(r => r.mirrorType === this.currentFilters.type);
    
    const versions = [...new Set(typeReleases.map(r => r.version))].sort().reverse();

    // Clear existing options except "All Versions"
    versionSelect.innerHTML = `
      <md-select-option value="all">
        <div slot="headline">All Versions</div>
      </md-select-option>
    `;

    // Add version options
    versions.forEach(version => {
      const option = document.createElement('md-select-option');
      option.value = version;
      option.innerHTML = `<div slot="headline">${version}</div>`;
      versionSelect.appendChild(option);
    });
  }

  filterAndRender() {
    this.filteredReleases = this.allReleases.filter(release => {
      // Filter by type
      if (this.currentFilters.type !== 'all' && release.mirrorType !== this.currentFilters.type) {
        return false;
      }

      // Filter by version
      if (this.currentFilters.version !== 'all' && release.version !== this.currentFilters.version) {
        return false;
      }

      // Filter by location
      if (this.currentFilters.location !== 'all' && release.mirrorLocation !== this.currentFilters.location) {
        return false;
      }

      return true;
    });

    this.renderReleases();
  }

  renderReleases() {
    const container = document.getElementById('releases-container');
    const list = document.getElementById('releases-list');
    const emptyContainer = document.getElementById('empty-container');

    if (!container || !list) return;

    if (this.filteredReleases.length === 0) {
      container.style.display = 'none';
      emptyContainer.style.display = 'flex';
      return;
    }

    container.style.display = 'block';
    emptyContainer.style.display = 'none';

    list.innerHTML = this.filteredReleases.map(release => this.createReleaseCard(release)).join('');

    // Add click handlers for expandable cards
    document.querySelectorAll('.release-header').forEach(header => {
      header.addEventListener('click', (e) => {
        // Don't expand if clicking on buttons
        if (e.target.closest('md-filled-button') || e.target.closest('md-outlined-button')) {
          return;
        }
        const card = header.closest('.release-card');
        card.classList.toggle('expanded');
      });
    });
  }

  createReleaseCard(release) {
    const hasBreakingChange = release.tags?.includes('BC');
    const isVerified = this.isVerified(release);

    // Format release tags
    const tagsHtml = release.tags?.map(tag => {
      const typeInfo = this.releaseTypes[tag] || RELEASE_TYPES[tag];
      if (!typeInfo) return '';
      return `<span class="tag-badge ${typeInfo.warning ? 'warning' : ''}" style="background-color: ${typeInfo.color}20; color: ${typeInfo.color}; border-color: ${typeInfo.color}40;">${typeInfo.warning ? '⚠ ' : ''}${tag}</span>`;
    }).join('') || '';

    // Format location flag
    const locationFlag = release.mirrorLocation === 'GR' ? '🇬🇷' : 
                        release.mirrorLocation === 'US' ? '🇺🇸' : '🌐';

    return `
      <div class="release-card ${isVerified ? 'verified' : ''} ${hasBreakingChange ? 'warning' : ''}">
        <div class="release-header">
          <div class="release-info">
            <div class="release-title">
              <h3>${release.name}</h3>
              <div class="release-badges">
                <span class="badge badge-version">v${release.version}</span>
                ${release.preRelease ? '<span class="badge badge-prerelease">Pre-release</span>' : ''}
                <span class="badge badge-location">${locationFlag} ${release.mirrorLocation}</span>
                ${isVerified ? '<span class="badge badge-verified">✓ Verified</span>' : ''}
              </div>
            </div>
            <div class="release-tags">
              ${tagsHtml}
            </div>
            <div class="release-meta">
              <span class="release-date">
                <md-icon style="font-size: 16px;">calendar_today</md-icon>
                ${new Date(release.releaseDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
              ${release.fileSize ? `
                <span class="release-size">
                  <md-icon style="font-size: 16px;">save</md-icon>
                  ${release.fileSize}
                </span>
              ` : ''}
            </div>
          </div>
          <div class="release-actions">
            ${release.downloadUrl ? `
              <md-filled-button onclick="window.open('${release.downloadUrl}', '_blank')">
                <md-icon slot="icon">download</md-icon>
                Download
              </md-filled-button>
            ` : ''}
            <md-outlined-button onclick="window.open('${release.repoUrl}', '_blank')">
              <md-icon slot="icon">open_in_new</md-icon>
              Source
            </md-outlined-button>
          </div>
        </div>
        
        <div class="release-content">
          <div class="release-description">${this.formatDescription(release.description)}</div>
          <div class="release-details">
            <div class="detail-item">
              <span class="detail-label">Release ID</span>
              <span class="detail-value">${release.releaseId || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Source</span>
              <span class="detail-value">${release.mirrorName}</span>
            </div>
            ${release.checksum ? `
              <div class="detail-item">
                <span class="detail-label">Checksum</span>
                <span class="detail-value">${release.checksum.substring(0, 30)}...</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  formatDescription(description) {
    if (!description) return 'No description available.';
    
    // Remove metadata tag
    let cleanDesc = description.replace(/#!JiboOSR:[^#]+#/, '').trim();
    
    // Convert markdown-style headers
    cleanDesc = cleanDesc.replace(/^## (.*$)/gim, '<h4>$1</h4>');
    cleanDesc = cleanDesc.replace(/^### (.*$)/gim, '<h5>$1</h5>');
    
    // Convert markdown-style bold
    cleanDesc = cleanDesc.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert markdown-style italic
    cleanDesc = cleanDesc.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert markdown-style lists
    cleanDesc = cleanDesc.replace(/^- (.*$)/gim, '<li>$1</li>');
    cleanDesc = cleanDesc.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Convert newlines to breaks (except after HTML tags)
    cleanDesc = cleanDesc.replace(/\n(?!<)/g, '<br>');
    
    // Make URLs clickable
    cleanDesc = cleanDesc.replace(
      /(https?:\/\/[^\s<]+)/g, 
      '<a href="$1" target="_blank" rel="noreferrer">$1</a>'
    );
    
    return cleanDesc;
  }

  isVerified(release) {
    // Simple verification based on releaseId presence
    // In production, this would check against a signed database
    return release.releaseId && release.releaseId.length > 0;
  }

  showLoading() {
    document.getElementById('loading-container').style.display = 'flex';
    document.getElementById('error-container').style.display = 'none';
    document.getElementById('releases-container').style.display = 'none';
    document.getElementById('empty-container').style.display = 'none';
  }

  showError(message) {
    document.getElementById('loading-container').style.display = 'none';
    document.getElementById('error-container').style.display = 'flex';
    document.getElementById('releases-container').style.display = 'none';
    document.getElementById('empty-container').style.display = 'none';
    document.getElementById('error-message').textContent = message;
  }
}

// Initialize when DOM is ready and Material components are loaded
function initApp() {
  // Check if Material components are loaded
  const checkInterval = setInterval(() => {
    if (customElements.get('md-outlined-select')) {
      clearInterval(checkInterval);
      console.log('Material components loaded, initializing app...');
      new ReleasesManager();
    }
  }, 100);

  // Timeout after 10 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
    console.warn('Material components timeout, initializing anyway...');
    new ReleasesManager();
  }, 10000);
}

// Wait for everything to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initApp, 1000);
  });
} else {
  setTimeout(initApp, 1000);
}
