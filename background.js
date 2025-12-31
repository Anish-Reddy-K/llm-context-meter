// LLM Context Meter - Background Service Worker
// Receives context data and updates the browser action icon

// Store current state per tab
const tabData = new Map();

// Default state
const DEFAULT_STATE = {
  platform: null,
  model: null,
  tokenCount: 0,
  contextLimit: 128000,
  percentage: 0,
  messageCount: 0,
  timestamp: 0
};

// Initialize icon on install/startup
chrome.runtime.onInstalled.addListener(() => {
  drawIcon(0);
});

chrome.runtime.onStartup.addListener(() => {
  drawIcon(0);
});

// Draw on load
drawIcon(0);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTEXT_UPDATE' && sender.tab) {
    const tabId = sender.tab.id;
    tabData.set(tabId, message.data);
    
    // Update icon for active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id === tabId) {
        updateIconForTab(tabId);
        // Store for popup
        chrome.storage.local.set({ 
          currentContext: message.data,
          activeTabId: tabId 
        });
      }
    });
  }
  
  if (message.type === 'GET_CONTEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const data = tabData.get(tabs[0].id) || DEFAULT_STATE;
        sendResponse(data);
      } else {
        sendResponse(DEFAULT_STATE);
      }
    });
    return true; // Keep channel open for async response
  }
});

// Update icon when tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateIconForTab(activeInfo.tabId);
});

// Update icon when tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Check if it's an LLM site
    const url = tab.url || '';
    const isLLMSite = url.includes('chat.openai.com') || 
                      url.includes('chatgpt.com') || 
                      url.includes('claude.ai') || 
                      url.includes('gemini.google.com');
    
    if (!isLLMSite) {
      // Clear data for non-LLM tabs
      tabData.delete(tabId);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id === tabId) {
          drawIcon(0, true); // Grey out icon
          chrome.storage.local.set({ 
            currentContext: { ...DEFAULT_STATE, inactive: true },
            activeTabId: tabId 
          });
        }
      });
    }
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
});

// Update icon for a specific tab
function updateIconForTab(tabId) {
  const data = tabData.get(tabId);
  if (data) {
    drawIcon(data.percentage);
    chrome.storage.local.set({ 
      currentContext: data,
      activeTabId: tabId 
    });
  } else {
    drawIcon(0, true); // Inactive/grey icon
    chrome.storage.local.set({ 
      currentContext: { ...DEFAULT_STATE, inactive: true },
      activeTabId: tabId 
    });
  }
}

// Draw the gauge icon
function drawIcon(percentage, inactive = false) {
  const size = 32;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 2;
  const innerRadius = radius - 4;

  // Clear canvas
  ctx.clearRect(0, 0, size, size);

  // Background ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI, true);
  ctx.fillStyle = inactive ? '#555' : '#2a2a2a';
  ctx.fill();

  if (!inactive && percentage > 0) {
    // Progress ring
    const startAngle = -Math.PI / 2; // Start at top
    const endAngle = startAngle + (Math.min(percentage, 100) / 100) * (2 * Math.PI);
    
    // Determine color based on percentage
    let color;
    if (percentage < 25) {
      color = '#22c55e'; // Green
    } else if (percentage < 50) {
      color = '#84cc16'; // Lime
    } else if (percentage < 75) {
      color = '#eab308'; // Yellow
    } else if (percentage < 90) {
      color = '#f97316'; // Orange
    } else {
      color = '#ef4444'; // Red
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Add glow effect for high usage
    if (percentage >= 75) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // Center circle with percentage text (if active)
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius - 1, 0, 2 * Math.PI);
  ctx.fillStyle = inactive ? '#333' : '#1a1a1a';
  ctx.fill();

  // Draw percentage text
  if (!inactive) {
    const displayValue = Math.round(percentage);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (displayValue >= 100) {
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('MAX', centerX, centerY);
    } else {
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(displayValue.toString(), centerX, centerY);
    }
  } else {
    // Draw dash for inactive
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('—', centerX, centerY);
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  chrome.action.setIcon({ imageData: imageData });
}
