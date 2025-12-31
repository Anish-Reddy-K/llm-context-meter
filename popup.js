// LLM Context Meter - Popup Script

const container = document.getElementById('content');

// Format large numbers
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Get color class based on percentage
function getColorClass(percentage) {
  if (percentage < 25) return 'green';
  if (percentage < 50) return 'lime';
  if (percentage < 75) return 'yellow';
  if (percentage < 90) return 'orange';
  return 'red';
}

// Get platform class
function getPlatformClass(platform) {
  if (!platform) return '';
  const p = platform.toLowerCase();
  if (p.includes('chatgpt') || p.includes('openai')) return 'chatgpt';
  if (p.includes('claude')) return 'claude';
  if (p.includes('gemini')) return 'gemini';
  return '';
}

// Format model name for display
function formatModelName(model) {
  if (!model || model.startsWith('default-')) return '';
  return model.toUpperCase().replace(/-/g, ' ');
}

// Calculate stroke dashoffset for SVG circle
function calculateDashOffset(percentage, circumference) {
  const progress = Math.min(percentage, 100) / 100;
  return circumference * (1 - progress);
}

// Render active state
function renderActive(data) {
  const percentage = Math.round(data.percentage || 0);
  const colorClass = getColorClass(percentage);
  const platformClass = getPlatformClass(data.platform);
  const modelName = formatModelName(data.model);
  const highUsage = percentage >= 75 ? 'high-usage' : '';

  // SVG circle calculations
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = calculateDashOffset(percentage, circumference);

  container.innerHTML = `
    <div class="header">
      <span class="platform-badge ${platformClass} active">${data.platform || 'LLM'}</span>
      ${modelName ? `<span class="model-name">${modelName}</span>` : ''}
    </div>

    <div class="gauge-container">
      <svg class="gauge-svg" viewBox="0 0 120 120">
        <circle class="gauge-bg" cx="60" cy="60" r="${radius}"/>
        <circle 
          class="gauge-progress ${colorClass}" 
          cx="60" 
          cy="60" 
          r="${radius}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${dashOffset}"
        />
      </svg>
      <div class="gauge-center">
        <div class="percentage ${colorClass} ${highUsage}">
          ${percentage}<span class="percentage-symbol">%</span>
        </div>
        <div class="label">Context Used</div>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${formatNumber(data.tokenCount || 0)}</div>
        <div class="stat-label">Tokens Used</div>
      </div>
      <div class="stat">
        <div class="stat-value">${formatNumber(data.contextLimit || 0)}</div>
        <div class="stat-label">Context Limit</div>
      </div>
    </div>
  `;
}

// Render inactive state
function renderInactive() {
  container.innerHTML = `
    <div class="inactive-message">
      <h3>No LLM Detected</h3>
      <p>Open a conversation on one of the supported sites to see context usage.</p>
      <div class="sites">
        <span class="site">ChatGPT</span>
        <span class="site">Claude</span>
        <span class="site">Gemini</span>
      </div>
    </div>
  `;
}

// Load and display data
function loadData() {
  // First try to get from storage
  chrome.storage.local.get(['currentContext'], (result) => {
    const data = result.currentContext;
    
    if (data && !data.inactive && data.platform) {
      renderActive(data);
    } else {
      // Try to get fresh data from background
      chrome.runtime.sendMessage({ type: 'GET_CONTEXT' }, (response) => {
        if (chrome.runtime.lastError) {
          renderInactive();
          return;
        }
        
        if (response && response.platform && !response.inactive) {
          renderActive(response);
        } else {
          renderInactive();
        }
      });
    }
  });
}

// Listen for storage changes (real-time updates)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.currentContext) {
    const data = changes.currentContext.newValue;
    if (data && !data.inactive && data.platform) {
      renderActive(data);
    } else {
      renderInactive();
    }
  }
});

// Initial load
loadData();
