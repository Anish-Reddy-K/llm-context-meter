// Initialize state
let currentValue = 0;

// Elements
const display = document.getElementById('value-display');
const btnIncrease = document.getElementById('increase');
const btnDecrease = document.getElementById('decrease');

// Load saved value
chrome.storage.local.get(['gaugeValue'], function(result) {
  if (result.gaugeValue !== undefined) {
    currentValue = result.gaugeValue;
    updateUI();
  } else {
      // If no value saved, initialize with 0
      updateGauge(0);
  }
});

// Listen for changes from background script (auto-updates)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.gaugeValue) {
    currentValue = changes.gaugeValue.newValue;
    updateUI();
  }
});

btnIncrease.addEventListener('click', () => {
  if (currentValue < 10) {
    currentValue++;
    updateGauge(currentValue);
  }
});

btnDecrease.addEventListener('click', () => {
  if (currentValue > 0) {
    currentValue--;
    updateGauge(currentValue);
  }
});

function updateGauge(value) {
  // Save state
  chrome.storage.local.set({ gaugeValue: value });
  updateUI();
  drawIcon(value);
}

function updateUI() {
  display.textContent = currentValue;
}

function drawIcon(value) {
  const canvas = document.createElement('canvas');
  const size = 32; // Use 32x32 for decent resolution
  canvas.width = size;
  canvas.height = size;
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
  // 0 to 10 maps to 0 to 2*PI (or maybe just a 270 degree arc for "gauge" look)
  // Let's do a full circle fill for simplicity: 0 is empty, 10 is full
  const startAngle = -Math.PI / 2; // Start at top
  const endAngle = startAngle + (value / 10) * (2 * Math.PI);

  ctx.beginPath();
  ctx.moveTo(size/2, size/2);
  ctx.arc(size/2, size/2, size/2 - 4, startAngle, endAngle);
  ctx.closePath();
  
  // Color based on value
  if (value < 4) ctx.fillStyle = '#4CAF50'; // Green
  else if (value < 8) ctx.fillStyle = '#FFC107'; // Yellow
  else ctx.fillStyle = '#F44336'; // Red
  
  ctx.fill();

  // Get image data
  const imageData = ctx.getImageData(0, 0, size, size);

  // Set the extension icon
  chrome.action.setIcon({ imageData: imageData });
}
