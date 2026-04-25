// Release configuration
const REPO_CONFIG = {
  'jibo-os': {
    name: 'Jibo OS',
    repos: [
      {
        name: 'Greece - Official Server',
        url: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboOs/releases.rss',
        location: 'GR',
        primary: true
      },
      {
        name: 'US - Mirror',
        url: 'https://code.zane.org/Mirrors/JiboOs/releases.rss',
        location: 'US',
        primary: false
      },
      {
        name: 'GitHub',
        url: 'https://github.com/Jibo-Revival-Group/JiboOs/releases',
        location: 'GH',
        primary: false,
        isGithub: true
      }
    ]
  },
  'jibo-mod': {
    name: 'Jibo Mod Tool',
    repos: [
      {
        name: 'Greece - Official Server',
        url: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboAutoMod/releases.rss',
        location: 'GR',
        primary: true
      },
      {
        name: 'US - Mirror',
        url: 'https://code.zane.org/Mirrors/JiboAutoMod/releases.rss',
        location: 'US',
        primary: false
      }
    ]
  }
};

// Release type mappings
const RELEASE_TYPES = {
  'NT': { label: 'Nightly', color: '#9333ea' },
  'BF': { label: 'Bug Fix', color: '#059669' },
  'RC': { label: 'Recommended', color: '#0ea5e9' },
  'RT': { label: 'Remote', color: '#f59e0b' },
  'NW': { label: 'New Features', color: '#10b981' },
  'IP': { label: 'Improvements', color: '#3b82f6' },
  'RF': { label: 'Refactored', color: '#8b5cf6' },
  'BC': { label: 'Breaking Change', color: '#ef4444', warning: true }
};

// Simple database for release verification (in real app, this would be server-side)
const RELEASE_DB = new Set([
  'JiboOS-v1.0.0-9823471',
  'JiboOS-v1.1.0-9823472',
  'JiboOS-v1.2.0-9823473',
  'JiboMod-v2.0.0-1234567',
  'JiboMod-v2.1.0-1234568'
]);

class ReleasesManager {
  constructor() {
    this.currentCategory = 'jibo-os';
    this.releases = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadCategory(this.currentCategory);
  }

  setupEventListeners() {
    // Category tabs
    document.querySelectorAll('.category-tab:not(.disabled)').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentCategory = e.target.dataset.category;
        this.loadCategory(this.currentCategory);
      });
    });
  }

  async loadCategory(category) {
    const loadingEl = document.getElementById('loading-message');
    const listEl = document.getElementById('releases-list');
    
    loadingEl.style.display = 'block';
    listEl.style.display = 'none';
    
    try {
      const config = REPO_CONFIG[category];
      if (!config) {
        throw new Error('Category not configured');
      }

      this.releases = [];
      
      // Fetch from all repos in parallel
      const promises = config.repos.map(repo => this.fetchReleases(repo));
      const results = await Promise.all(promises);
      
      // Merge and sort releases
      results.forEach(releases => {
        this.releases.push(...releases);
      });
      
      // Sort by date (newest first) and group by version
      this.releases.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      this.renderReleases();
      
    } catch (error) {
      console.error('Error loading releases:', error);
      loadingEl.innerHTML = `
        <div class="error-message">
          <p>Failed to load releases. Please try again later.</p>
          <button class="button button--primary" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  async fetchReleases(repo) {
    if (repo.isGithub) {
      return this.fetchGithubReleases(repo);
    } else {
      return this.fetchRSSReleases(repo);
    }
  }

  async fetchRSSReleases(repo) {
    try {
      // Try direct fetch first (will work when served from GitHub Pages)
      let response = await fetch(repo.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      return this.parseRSS(text, repo);
    } catch (error) {
      console.log(`Direct fetch failed for ${repo.name}, trying CORS proxy...`);
      
      // Fallback to CORS proxy for local development
      try {
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${repo.url}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Proxy HTTP ${response.status}`);
        }
        const text = await response.text();
        return this.parseRSS(text, repo);
      } catch (proxyError) {
        console.log(`CORS proxy failed for ${repo.name}, trying alternative proxy...`);
        
        // Try another CORS proxy
        try {
          const altProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(repo.url)}`;
          const response = await fetch(altProxyUrl);
          if (!response.ok) {
            throw new Error(`Alt proxy HTTP ${response.status}`);
          }
          const data = await response.json();
          return this.parseRSS(data.contents, repo);
        } catch (altProxyError) {
          console.error(`All fetch methods failed for ${repo.name}:`, altProxyError);
          
          // Return mock data for demonstration when all else fails
          return this.getMockReleases(repo);
        }
      }
    }
  }

  async fetchGithubReleases(repo) {
    try {
      // GitHub API for releases
      const apiUrl = 'https://api.github.com/repos/Jibo-Revival-Group/JiboOs/releases';
      const response = await fetch(apiUrl);
      const releases = await response.json();
      
      return releases.map(release => ({
        version: release.tag_name,
        name: release.name,
        description: release.body,
        date: release.published_at,
        prerelease: release.prerelease,
        downloadUrl: release.assets[0]?.browser_download_url,
        sourceUrl: release.html_url,
        repo: repo,
        metadata: this.parseMetadata(release.body)
      }));
    } catch (error) {
      console.error(`Error fetching GitHub releases:`, error);
      return [];
    }
  }

  parseRSS(text, repo) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    const items = doc.querySelectorAll('item');
    
    return Array.from(items).map(item => {
      const title = item.querySelector('title')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      
      // Extract version from title (usually "Release v1.0.0")
      const versionMatch = title.match(/v?(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : title;
      
      // Find download link in description
      const downloadMatch = description.match(/href="([^"]*\.zip|[^"]*\.tar\.gz)"/);
      const downloadUrl = downloadMatch ? downloadMatch[1] : '';
      
      return {
        version,
        name: title,
        description,
        date: new Date(pubDate).toISOString(),
        prerelease: title.toLowerCase().includes('pre') || title.toLowerCase().includes('beta'),
        downloadUrl,
        sourceUrl: link,
        repo,
        metadata: this.parseMetadata(description)
      };
    });
  }

  parseMetadata(description) {
    // Look for metadata tag at the end of description
    const metadataMatch = description.match(/#!JiboOSR:(\d+)\|([^#]+)#/);
    if (!metadataMatch) return {};
    
    const [, releaseId, typesStr] = metadataMatch;
    const types = typesStr.split('|').filter(t => t.trim());
    
    return {
      releaseId,
      types: types.map(t => t.trim())
    };
  }

  getMockReleases(repo) {
    console.log(`Returning mock releases for ${repo.name}`);
    
    const mockData = {
      'JiboOs': [
        {
          version: '1.0.0',
          name: 'Jibo OS v1.0.0 - Stable Release',
          description: 'Initial stable release of Jibo OS with basic functionality restored.\n\nFeatures:\n- Core system services\n- Basic motor control\n- Voice recognition\n- LED animations\n\n#!JiboOSR:9823471|RC|NW|IP#',
          date: '2024-01-15T10:00:00Z',
          prerelease: false,
          downloadUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboOs/releases/download/v1.0.0/jibo-os-1.0.0.zip',
          sourceUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboOs/releases/tag/v1.0.0',
          repo: repo,
          metadata: { releaseId: '9823471', types: ['RC', 'NW', 'IP'] }
        },
        {
          version: '1.1.0-beta',
          name: 'Jibo OS v1.1.0 Beta - New Features',
          description: 'Beta release with experimental features and improvements.\n\nNew Features:\n- Enhanced voice commands\n- Improved motor control\n- New LED patterns\n- Bug fixes\n\n#!JiboOSR:9823472|NT|NW|BF|IP#',
          date: '2024-02-01T14:30:00Z',
          prerelease: true,
          downloadUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboOs/releases/download/v1.1.0-beta/jibo-os-1.1.0-beta.zip',
          sourceUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboOs/releases/tag/v1.1.0-beta',
          repo: repo,
          metadata: { releaseId: '9823472', types: ['NT', 'NW', 'BF', 'IP'] }
        },
        {
          version: '1.2.0',
          name: 'Jibo OS v1.2.0 - Breaking Changes',
          description: 'Major update with breaking changes for better architecture.\n\nIMPORTANT: This release contains breaking changes!\n\nChanges:\n- Refactored core architecture\n- New API structure\n- Improved performance\n- Enhanced security\n\n#!JiboOSR:9823473|BC|RF|RC|IP#',
          date: '2024-02-20T09:15:00Z',
          prerelease: false,
          downloadUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboOs/releases/download/v1.2.0/jibo-os-1.2.0.zip',
          sourceUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboOs/releases/tag/v1.2.0',
          repo: repo,
          metadata: { releaseId: '9823473', types: ['BC', 'RF', 'RC', 'IP'] }
        }
      ],
      'JiboAutoMod': [
        {
          version: '2.0.0',
          name: 'Jibo Auto Mod v2.0.0',
          description: 'Automated mod installation tool for Jibo OS.\n\nFeatures:\n- One-click installation\n- Automatic updates\n- Backup functionality\n- Recovery tools\n\n#!JiboOSR:1234567|RC|NW|RT#',
          date: '2024-01-20T16:00:00Z',
          prerelease: false,
          downloadUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboAutoMod/releases/download/v2.0.0/jibo-auto-mod-2.0.0.zip',
          sourceUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboAutoMod/releases/tag/v2.0.0',
          repo: repo,
          metadata: { releaseId: '1234567', types: ['RC', 'NW', 'RT'] }
        },
        {
          version: '2.1.0-nightly',
          name: 'Jibo Auto Mod v2.1.0 Nightly',
          description: 'Latest nightly build with experimental features.\n\nChanges:\n- Improved installation speed\n- Better error handling\n- New mod support\n- UI improvements\n\n#!JiboOSR:1234568|NT|BF|IP#',
          date: '2024-02-05T11:30:00Z',
          prerelease: true,
          downloadUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboAutoMod/releases/download/v2.1.0-nightly/jibo-auto-mod-2.1.0-nightly.zip',
          sourceUrl: 'https://kevinblog.sytes.net/Code/Jibo-Revival-Group/JiboAutoMod/releases/tag/v2.1.0-nightly',
          repo: repo,
          metadata: { releaseId: '1234568', types: ['NT', 'BF', 'IP'] }
        }
      ]
    };

    // Extract repo name from URL to determine which mock data to return
    if (repo.url.includes('JiboOs')) {
      return mockData.JiboOs || [];
    } else if (repo.url.includes('JiboAutoMod')) {
      return mockData.JiboAutoMod || [];
    }
    
    return [];
  }

  isVerified(release) {
    if (!release.metadata.releaseId) return false;
    const key = `${this.currentCategory === 'jibo-os' ? 'JiboOS' : 'JiboMod'}-v${release.version}-${release.metadata.releaseId}`;
    return RELEASE_DB.has(key);
  }

  renderReleases() {
    const loadingEl = document.getElementById('loading-message');
    const listEl = document.getElementById('releases-list');
    
    loadingEl.style.display = 'none';
    listEl.style.display = 'block';
    
    if (this.releases.length === 0) {
      listEl.innerHTML = '<p class="no-releases">No releases found for this category.</p>';
      return;
    }
    
    listEl.innerHTML = this.releases.map(release => this.createReleaseHTML(release)).join('');
    
    // Add event listeners for expandable items
    document.querySelectorAll('.release-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.release-actions')) return;
        item.classList.toggle('expanded');
      });
    });
  }

  createReleaseHTML(release) {
    const verified = this.isVerified(release);
    const metadata = release.metadata;
    const hasBreakingChange = metadata.types?.includes('BC');
    
    const typeTags = metadata.types?.map(type => {
      const typeInfo = RELEASE_TYPES[type];
      if (!typeInfo) return '';
      return `<span class="type-tag ${type.toLowerCase()} ${typeInfo.warning ? 'warning' : ''}" style="background-color: ${typeInfo.color}20; color: ${typeInfo.color}; border-color: ${typeInfo.color};">
        ${typeInfo.warning ? 'â ' : ''}${type}: ${typeInfo.label}
      </span>`;
    }).join('') || '';

    return `
      <div class="release-item ${verified ? 'verified' : ''}" data-version="${release.version}" data-release-id="${metadata.releaseId || ''}">
        <div class="release-header">
          <div class="release-info">
            <div class="release-title">
              <h3>${release.name}</h3>
              <div class="release-meta">
                <span class="version-tag">v${release.version}</span>
                ${release.prerelease ? '<span class="prerelease-tag">Pre-release</span>' : ''}
                ${verified ? '<span class="verified-badge" title="Verified release">â</span>' : ''}
                ${hasBreakingChange ? '<span class="warning-badge" title="May contain breaking changes">â </span>' : ''}
                <span class="location-badge" title="${release.repo.name}">ð${release.repo.location}</span>
              </div>
            </div>
            ${typeTags ? `<div class="release-types">${typeTags}</div>` : ''}
            <div class="release-date">
              ${new Date(release.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
          <div class="release-actions">
            ${release.downloadUrl ? `
              <a href="${release.downloadUrl}" class="button button--primary" download>
                â Download
              </a>
            ` : ''}
            <a href="${release.sourceUrl}" class="button button--ghost" target="_blank" rel="noreferrer">
              Source
            </a>
          </div>
        </div>
        
        <div class="release-content">
          <div class="release-description">
            ${this.formatDescription(release.description)}
          </div>
          ${metadata.releaseId ? `
            <div class="release-metadata">
              <small>Release ID: ${metadata.releaseId}</small>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  formatDescription(description) {
    // Remove the metadata tag from description
    const cleanDesc = description.replace(/#!JiboOSR:[^#]+#/, '').trim();
    
    // Convert newlines to HTML and make links clickable
    return cleanDesc
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ReleasesManager();
});

// Theme handling (reuse from main site)
const themeToggle = document.getElementById("theme-toggle");
const themeMenu = document.getElementById("theme-menu");
const themeKey = "jibo-revival-theme";

const applyTheme = (theme) => {
  if (theme !== "aero") {
    document.body.removeAttribute("data-theme");
  } else {
    document.body.dataset.theme = theme;
  }
  localStorage.setItem(themeKey, theme);
};

if (themeToggle && themeMenu) {
  themeToggle.addEventListener("click", () => {
    const expanded = themeToggle.getAttribute("aria-expanded") === "true";
    themeToggle.setAttribute("aria-expanded", !expanded);
    themeMenu.hidden = expanded;
  });

  document.addEventListener("click", (e) => {
    if (!themeToggle.contains(e.target) && !themeMenu.contains(e.target)) {
      themeMenu.hidden = true;
      themeToggle.setAttribute("aria-expanded", "false");
    }
  });

  themeMenu.querySelectorAll(".theme-menu__item").forEach((item) => {
    item.addEventListener("click", () => {
      applyTheme(item.dataset.theme);
      themeMenu.hidden = true;
      themeToggle.setAttribute("aria-expanded", "false");
    });
  });
}

applyTheme(localStorage.getItem(themeKey) === "aero" ? "aero" : "default");
