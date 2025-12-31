// Restore the gauge icon when the extension is installed or browser starts
function restoreIcon() {
  chrome.storage.local.get(['gaugeValue'], function(result) {
    const value = result.gaugeValue || 0;
    drawIcon(value);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  restoreIcon();
  scheduleNextUpdate();
});
chrome.runtime.onStartup.addListener(() => {
  restoreIcon();
  scheduleNextUpdate();
});

// Automatic update loop
function scheduleNextUpdate() {
  // Random interval between 500ms and 2000ms (0.5s - 2s)
  const delay = Math.floor(Math.random() * 1500) + 500;
  setTimeout(autoUpdateGauge, delay);
}

function autoUpdateGauge() {
  chrome.storage.local.get(['gaugeValue'], function(result) {
    let newValue = (result.gaugeValue || 0) + 1;
    if (newValue > 10) newValue = 1; // Cycle from 1 to 10

    // Save and Draw
    // Note: We don't need to explicitly call drawIcon here if we just update storage 
    // AND have a storage listener, but drawing directly is faster/simpler for the icon.
    // We update storage so popup stays in sync.
    chrome.storage.local.set({ gaugeValue: newValue });
    drawIcon(newValue);

    scheduleNextUpdate();
  });
}

// Start the loop immediately when this script loads (e.g. on wake up)
scheduleNextUpdate();

// We need to duplicate the draw logic here because we can't share code easily 
// between popup and background in a simple setup without modules.
function drawIcon(value) {
  // Use OffscreenCanvas if available (Chrome 109+), or just basic canvas API if supported in SW (limited)
  // Service Workers don't support DOM 'document.createElement', so we need OffscreenCanvas.
  
  const size = 32;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background (light gray circle)
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, 2 * Math.PI);
  ctx.fillStyle = '#eeeeee';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#999';
  ctx.stroke();

  // Gauge (filled arc)
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (value / 10) * (2 * Math.PI);

  ctx.beginPath();
  ctx.moveTo(size/2, size/2);
  ctx.arc(size/2, size/2, size/2 - 4, startAngle, endAngle);
  ctx.closePath();
  
  if (value < 4) ctx.fillStyle = '#4CAF50';
  else if (value < 8) ctx.fillStyle = '#FFC107';
  else ctx.fillStyle = '#F44336';
  
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, size, size);
  chrome.action.setIcon({ imageData: imageData });
}
