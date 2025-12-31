// LLM Context Meter - Content Script
// Scrapes conversation data from ChatGPT, Claude, and Gemini

(function() {
  'use strict';

  // Detect which platform we're on
  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('chat.openai.com') || host.includes('chatgpt.com')) {
      return 'chatgpt';
    } else if (host.includes('claude.ai')) {
      return 'claude';
    } else if (host.includes('gemini.google.com')) {
      return 'gemini';
    }
    return null;
  }

  // Model context windows (in tokens)
  const MODEL_CONTEXTS = {
    // ChatGPT models
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-3.5-turbo': 16385,
    'gpt-3.5': 16385,
    'o1': 200000,
    'o1-mini': 128000,
    'o1-preview': 128000,
    
    // Claude models
    'claude-3-5-sonnet': 200000,
    'claude-3-opus': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-haiku': 200000,
    'claude-2': 100000,
    'claude': 200000,
    
    // Gemini models
    'gemini-2.0-flash': 1000000,
    'gemini-1.5-pro': 1000000,
    'gemini-1.5-flash': 1000000,
    'gemini-1.0-pro': 32000,
    'gemini': 1000000,
    
    // Defaults per platform
    'default-chatgpt': 128000,
    'default-claude': 200000,
    'default-gemini': 1000000
  };

  // Approximate tokens from text (roughly 4 chars = 1 token for English)
  // This is a simplified estimation - actual tokenizers vary
  function estimateTokens(text) {
    if (!text) return 0;
    // More accurate estimation: consider word boundaries and special chars
    // Average is ~4 chars per token, but we account for whitespace
    const charCount = text.length;
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    // Blend char-based and word-based estimation
    return Math.ceil((charCount / 4 + wordCount * 1.3) / 2);
  }

  // Scrape ChatGPT conversation
  function scrapeChatGPT() {
    const messages = [];
    
    // Try multiple selectors for ChatGPT's evolving DOM
    const messageContainers = document.querySelectorAll(
      '[data-message-author-role], .message, [class*="ConversationItem"], article[data-testid]'
    );
    
    messageContainers.forEach(container => {
      const role = container.getAttribute('data-message-author-role') || 
                   (container.classList.contains('user') ? 'user' : 'assistant');
      const textContent = container.textContent || '';
      if (textContent.trim()) {
        messages.push({ role, content: textContent.trim() });
      }
    });

    // Fallback: get all conversation text
    if (messages.length === 0) {
      const mainContent = document.querySelector('main');
      if (mainContent) {
        const text = mainContent.textContent || '';
        messages.push({ role: 'conversation', content: text });
      }
    }

    // Try to detect the model
    let model = 'default-chatgpt';
    const modelSelector = document.querySelector(
      '[class*="model"], button[aria-haspopup="menu"] span, [data-testid*="model"]'
    );
    if (modelSelector) {
      const modelText = modelSelector.textContent.toLowerCase();
      if (modelText.includes('4o-mini')) model = 'gpt-4o-mini';
      else if (modelText.includes('4o')) model = 'gpt-4o';
      else if (modelText.includes('4-turbo')) model = 'gpt-4-turbo';
      else if (modelText.includes('gpt-4')) model = 'gpt-4';
      else if (modelText.includes('o1-mini')) model = 'o1-mini';
      else if (modelText.includes('o1-preview')) model = 'o1-preview';
      else if (modelText.includes('o1')) model = 'o1';
      else if (modelText.includes('3.5')) model = 'gpt-3.5-turbo';
    }

    return { messages, model, platform: 'ChatGPT' };
  }

  // Scrape Claude conversation
  function scrapeClaude() {
    const messages = [];
    
    // Claude's message containers
    const messageContainers = document.querySelectorAll(
      '[class*="Message"], [class*="message-content"], .prose, [data-testid*="message"]'
    );
    
    messageContainers.forEach(container => {
      const textContent = container.textContent || '';
      if (textContent.trim() && textContent.length > 10) {
        // Determine role based on styling/position
        const isHuman = container.closest('[class*="human"]') || 
                        container.closest('[class*="Human"]') ||
                        container.closest('[data-is-user="true"]');
        messages.push({ 
          role: isHuman ? 'user' : 'assistant', 
          content: textContent.trim() 
        });
      }
    });

    // Fallback: get conversation area
    if (messages.length === 0) {
      const conversationArea = document.querySelector('[class*="conversation"], main, [role="main"]');
      if (conversationArea) {
        const text = conversationArea.textContent || '';
        messages.push({ role: 'conversation', content: text });
      }
    }

    // Try to detect Claude model
    let model = 'default-claude';
    const modelIndicator = document.querySelector(
      '[class*="model"], [class*="Model"], button[aria-label*="model"]'
    );
    if (modelIndicator) {
      const modelText = modelIndicator.textContent.toLowerCase();
      if (modelText.includes('opus')) model = 'claude-3-opus';
      else if (modelText.includes('sonnet')) model = 'claude-3-5-sonnet';
      else if (modelText.includes('haiku')) model = 'claude-3-haiku';
    }

    return { messages, model, platform: 'Claude' };
  }

  // Scrape Gemini conversation
  function scrapeGemini() {
    const messages = [];
    
    // Gemini's message containers
    const messageContainers = document.querySelectorAll(
      '[class*="message"], [class*="query"], [class*="response"], .conversation-turn'
    );
    
    messageContainers.forEach(container => {
      const textContent = container.textContent || '';
      if (textContent.trim() && textContent.length > 5) {
        const isUser = container.classList.contains('query') || 
                       container.closest('[class*="user"]') ||
                       container.querySelector('[class*="user-query"]');
        messages.push({ 
          role: isUser ? 'user' : 'assistant', 
          content: textContent.trim() 
        });
      }
    });

    // Fallback
    if (messages.length === 0) {
      const mainArea = document.querySelector('main, [role="main"], .chat-container');
      if (mainArea) {
        const text = mainArea.textContent || '';
        messages.push({ role: 'conversation', content: text });
      }
    }

    // Detect Gemini model
    let model = 'default-gemini';
    const modelButton = document.querySelector(
      '[class*="model-selector"], [aria-label*="model"], button[class*="model"]'
    );
    if (modelButton) {
      const modelText = modelButton.textContent.toLowerCase();
      if (modelText.includes('2.0')) model = 'gemini-2.0-flash';
      else if (modelText.includes('1.5 pro')) model = 'gemini-1.5-pro';
      else if (modelText.includes('1.5 flash')) model = 'gemini-1.5-flash';
      else if (modelText.includes('1.0')) model = 'gemini-1.0-pro';
    }

    return { messages, model, platform: 'Gemini' };
  }

  // Main scraping function
  function scrapeConversation() {
    const platform = detectPlatform();
    if (!platform) {
      return null;
    }

    let data;
    switch (platform) {
      case 'chatgpt':
        data = scrapeChatGPT();
        break;
      case 'claude':
        data = scrapeClaude();
        break;
      case 'gemini':
        data = scrapeGemini();
        break;
      default:
        return null;
    }

    // Calculate total text and tokens
    const totalText = data.messages.map(m => m.content).join(' ');
    const tokenCount = estimateTokens(totalText);
    const contextLimit = MODEL_CONTEXTS[data.model] || MODEL_CONTEXTS[`default-${platform}`];
    
    // Add overhead for system prompts and thinking (roughly 5-15% depending on model)
    const overheadMultiplier = data.model.includes('o1') ? 1.3 : 1.1; // o1 models use more for thinking
    const adjustedTokens = Math.ceil(tokenCount * overheadMultiplier);

    return {
      platform: data.platform,
      model: data.model,
      tokenCount: adjustedTokens,
      rawTokenCount: tokenCount,
      contextLimit: contextLimit,
      percentage: Math.min(100, (adjustedTokens / contextLimit) * 100),
      messageCount: data.messages.length,
      timestamp: Date.now()
    };
  }

  // Send data to background script
  function sendUpdate() {
    const data = scrapeConversation();
    if (data) {
      chrome.runtime.sendMessage({
        type: 'CONTEXT_UPDATE',
        data: data
      }).catch(() => {
        // Extension context may be invalidated, ignore
      });
    }
  }

  // Debounce function for performance
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

  // Debounced update (300ms) - fast enough to feel real-time, slow enough to not hammer CPU
  const debouncedUpdate = debounce(sendUpdate, 300);

  // Observe DOM changes to detect new messages
  function startObserving() {
    const observer = new MutationObserver((mutations) => {
      // Only trigger on meaningful changes
      const hasRelevantChange = mutations.some(mutation => {
        return mutation.addedNodes.length > 0 || 
               mutation.type === 'characterData' ||
               (mutation.type === 'attributes' && mutation.attributeName === 'class');
      });
      
      if (hasRelevantChange) {
        debouncedUpdate();
      }
    });

    // Observe the main content area
    const targetNode = document.body;
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Initial scrape
    sendUpdate();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }

  // Also update periodically as a fallback (every 2 seconds)
  setInterval(sendUpdate, 2000);

  // Update on visibility change (when user switches back to tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sendUpdate();
    }
  });

})();

