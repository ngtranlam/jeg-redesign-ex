// == Content Script: Floating Capture Button & Area Screenshot ==

// --- Insert floating capture button ---
(function insertCaptureButton() {
  // Remove old button if exists
  const oldBtn = document.getElementById('jeg-capture-btn');
  if (oldBtn) oldBtn.remove();

  // Create button
  const btn = document.createElement('div');
  btn.id = 'jeg-capture-btn';
  Object.assign(btn.style, {
    position: 'fixed', bottom: '40px', right: '40px', zIndex: 999999,
    width: '56px', height: '56px', background: '#fff', borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s',
  });
  btn.title = 'Capture screen area';

  // Icon (bạn thay src nếu muốn)
  const iconImg = document.createElement('img');
  iconImg.src = chrome.runtime.getURL('icons/cropicon.png');
  iconImg.style.width = '40px';
  iconImg.style.height = '40px';
  iconImg.style.objectFit = 'contain';
  iconImg.alt = 'capture icon';
  iconImg.onerror = function() {
    iconImg.style.display = 'none';
    btn.textContent = '💡';
  };
  btn.appendChild(iconImg);

  btn.addEventListener('click', checkUserNameAndStart);
  document.body.appendChild(btn);
})();

// Check user name before starting
function checkUserNameAndStart() {
  chrome.storage.local.get(['userName'], function(result) {
    if (result.userName) {
      // Has name, allow usage
      startSelection();
    } else {
      // No name yet, request input
      showNameRequiredNotification();
    }
  });
}

// Show notification requesting name input
function showNameRequiredNotification() {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="color: #ef4444; font-size: 18px;">⚠️</div>
      <div>
        <div style="font-weight: bold; margin-bottom: 4px;">Please enter your information before using!</div>
        <div style="font-size: 12px; color: #666;">Click on the extension icon to login with your JEG Account</div>
      </div>
    </div>
  `;
  
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.background = '#fff';
  notification.style.color = '#333';
  notification.style.padding = '16px 20px';
  notification.style.borderRadius = '8px';
  notification.style.zIndex = '9999999';
  notification.style.fontSize = '14px';
  notification.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
  notification.style.border = '2px solid #ef4444';
  notification.style.maxWidth = '300px';
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Listen for message from popup when name is updated
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'nameUpdated') {
    console.log('User name has been updated:', message.name);
    if (message.username) {
      console.log('Username:', message.username);
    }
    // Can add other logic if needed
  }
});

// Function to increment usage count
function incrementUsageCount() {
  chrome.storage.local.get(['usageCount'], function(result) {
    const currentCount = result.usageCount || 0;
    const newCount = currentCount + 1;
    
    chrome.storage.local.set({ usageCount: newCount }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error updating usage count:', chrome.runtime.lastError);
      } else {
        console.log('Usage count updated to:', newCount);
      }
    });
  });
}

// --- Insert CSS for overlay & popup (only once) ---
(function insertCaptureCSS() {
  if (document.getElementById('jeg-capture-style')) return;
  const style = document.createElement('style');
  style.id = 'jeg-capture-style';
  style.textContent = `
#jeg-capture-overlay {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  z-index: 999998; background: rgba(0,0,0,0.15); cursor: crosshair;
}
#jeg-capture-rect {
  position: absolute; border: 2px dashed #4285f4;
  background: rgba(66,133,244,0.15); pointer-events: none;
}
#jeg-capture-popup-bg {
  position: fixed; left: 0; top: 0; right: 0; bottom: 0;
  z-index: 1000000; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
}
#jeg-capture-popup {
  background: #fff; border: 1.5px solid #ccc; border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25); padding: 32px 32px 24px 32px;
  text-align: center;
  width: 66vw; height: 66vh;
  max-width: 66vw; max-height: 66vh;
  min-width: 320px; min-height: 200px;
  overflow: auto; position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
#jeg-capture-popup img {
  width: 100%; height: 100%; object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
#jeg-capture-popup .btn-group {
  margin-top: 24px; display: flex; justify-content: center; gap: 18px;
}
#jeg-capture-popup a, #jeg-capture-popup button {
  padding: 10px 28px; border-radius: 6px; font-weight: bold; font-size: 17px;
  border: none; cursor: pointer;
}
#jeg-capture-popup a {
  background: #4285f4; color: #fff; text-decoration: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
#jeg-capture-popup button {
  background: #eee; color: #333;
}
`;
  document.head.appendChild(style);
})();

// --- Area selection logic ---
let startX, startY, rect, overlay;
function startSelection() {
  overlay = document.createElement('div');
  overlay.id = 'jeg-capture-overlay';
  document.body.appendChild(overlay);

  rect = document.createElement('div');
  rect.id = 'jeg-capture-rect';
  overlay.appendChild(rect);

  overlay.addEventListener('mousedown', onMouseDown);
}
function onMouseDown(e) {
  startX = e.clientX;
  startY = e.clientY;
  rect.style.left = startX + 'px';
  rect.style.top = startY + 'px';
  rect.style.width = '0px';
  rect.style.height = '0px';
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);
}
function onMouseMove(e) {
  const x = Math.min(e.clientX, startX);
  const y = Math.min(e.clientY, startY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);
  rect.style.left = x + 'px';
  rect.style.top = y + 'px';
  rect.style.width = w + 'px';
  rect.style.height = h + 'px';
}
function onMouseUp(e) {
  overlay.removeEventListener('mousemove', onMouseMove);
  overlay.removeEventListener('mouseup', onMouseUp);
  const x = Math.min(e.clientX, startX);
  const y = Math.min(e.clientY, startY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);
  overlay.remove();
  captureSelectedArea(x, y, w, h);
}

// --- Capture and show popup ---
async function captureSelectedArea(x, y, w, h) {
  chrome.runtime.sendMessage({action: 'capture'}, (response) => {
    if (response && response.dataUrl) {
      const img = new window.Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, x * window.devicePixelRatio, y * window.devicePixelRatio, w * window.devicePixelRatio, h * window.devicePixelRatio, 0, 0, w, h);
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          showPreviewPopup(canvas.toDataURL('image/png'), url);
        }, 'image/png');
      };
      img.src = response.dataUrl;
    } else {
      showPreviewPopup(null, null, true);
    }
  });
}

function showPreviewPopup(dataUrl, blobUrl, isError) {
  // Remove old popup if exists
  const oldBg = document.getElementById('jeg-capture-popup-bg');
  if (oldBg) oldBg.remove();

  // Background overlay
  const bg = document.createElement('div');
  bg.id = 'jeg-capture-popup-bg';
  bg.style.background = '#eee';

  // Popup
  const popup = document.createElement('div');
  popup.id = 'jeg-capture-popup';
  popup.style.background = '#eee';
  popup.style.border = '1px solid #888';
  popup.style.borderRadius = '8px';
  popup.style.padding = '0';
  popup.style.width = '1500px';
  popup.style.maxWidth = '99vw';
  popup.style.height = '950px';
  popup.style.maxHeight = '99vh';
  popup.style.display = 'flex';
  popup.style.flexDirection = 'column';
  popup.style.boxSizing = 'border-box';
  popup.style.position = 'relative';
  popup.style.justifyContent = 'space-between';

  // Top bar with Provider, Model selection on the left, RUN button on the right
  const topBar = document.createElement('div');
  topBar.style.display = 'flex';
  topBar.style.justifyContent = 'space-between';
  topBar.style.alignItems = 'flex-start';
  topBar.style.height = '80px';
  topBar.style.padding = '16px 16px 0 16px'; // giảm padding sát mép
  topBar.style.boxSizing = 'border-box';
  topBar.style.width = '100%';

  // Provider + Model group (sát trái)
  const leftTopGroup = document.createElement('div');
  leftTopGroup.style.display = 'flex';
  leftTopGroup.style.gap = '24px';
  leftTopGroup.style.alignItems = 'flex-start';
  leftTopGroup.style.justifyContent = 'flex-start';
  leftTopGroup.style.marginLeft = '0'; // sát trái

  // Provider
  const providerWrap = document.createElement('div');
  providerWrap.style.display = 'flex';
  providerWrap.style.flexDirection = 'column';
  providerWrap.style.gap = '4px';
  const providerLabel = document.createElement('label');
  providerLabel.textContent = 'PROVIDER';
  providerLabel.style.fontWeight = 'bold';
  providerLabel.style.fontSize = '14px';
  providerLabel.style.textAlign = 'left';
  providerLabel.style.width = '100%';
  const providerSelect = document.createElement('select');
  providerSelect.style.padding = '6px 12px';
  providerSelect.style.fontSize = '15px';
  providerSelect.style.borderRadius = '6px';
  providerSelect.style.border = '1px solid #888';
  providerSelect.innerHTML = '<option value="openai">Open AI</option><option value="gemini">Gemini</option>';
  providerWrap.appendChild(providerLabel);
  providerWrap.appendChild(providerSelect);

  // Model
  const modelWrap = document.createElement('div');
  modelWrap.style.display = 'flex';
  modelWrap.style.flexDirection = 'column';
  modelWrap.style.gap = '4px';
  const modelLabel = document.createElement('label');
  modelLabel.textContent = 'MODEL';
  modelLabel.style.fontWeight = 'bold';
  modelLabel.style.fontSize = '14px';
  modelLabel.style.textAlign = 'left';
  modelLabel.style.width = '100%';
  const modelSelect = document.createElement('select');
  modelSelect.style.padding = '6px 12px';
  modelSelect.style.fontSize = '15px';
  modelSelect.style.borderRadius = '6px';
  modelSelect.style.border = '1px solid #888';
  // Function to update model options based on provider
  function updateModelOptions() {
    if (providerSelect.value === 'openai') {
      modelSelect.innerHTML = '<option>gpt-4.1</option><option>GPT Image 1</option>';
    } else if (providerSelect.value === 'gemini') {
      modelSelect.innerHTML = '<option>imagen 4.0</option><option>imagen 3.0</option>';
    }
  }
  updateModelOptions();
  providerSelect.addEventListener('change', updateModelOptions);
  modelWrap.appendChild(modelLabel);
  modelWrap.appendChild(modelSelect);

  // MODE dropdown
  const modeWrap = document.createElement('div');
  modeWrap.style.display = 'flex';
  modeWrap.style.flexDirection = 'column';
  modeWrap.style.gap = '4px';
  const modeLabel = document.createElement('label');
  modeLabel.textContent = 'MODE';
  modeLabel.style.fontWeight = 'bold';
  modeLabel.style.fontSize = '14px';
  modeLabel.style.textAlign = 'left';
  modeLabel.style.width = '100%';
  const modeSelect = document.createElement('select');
  modeSelect.style.padding = '6px 12px';
  modeSelect.style.fontSize = '15px';
  modeSelect.style.borderRadius = '6px';
  modeSelect.style.border = '1px solid #888';
  modeSelect.innerHTML = '<option value="canny">Canny</option><option value="normal">Normal</option><option value="custom">Custom</option>';
  modeWrap.appendChild(modeLabel);
  modeWrap.appendChild(modeSelect);

  // PROMPT input (2 fields, horizontal)
  const promptWrap = document.createElement('div');
  promptWrap.style.display = 'none'; // Hidden by default
  promptWrap.style.flexDirection = 'row';
  promptWrap.style.gap = '24px';
  promptWrap.style.marginTop = '8px';
  promptWrap.style.width = '100%';
  promptWrap.style.alignItems = 'flex-end';

  // Col 1: Object to replace
  const promptCol1 = document.createElement('div');
  promptCol1.style.display = 'flex';
  promptCol1.style.flexDirection = 'column';
  promptCol1.style.gap = '4px';
  promptCol1.style.flex = '1';
  const objectLabel = document.createElement('label');
  objectLabel.textContent = 'Object to replace:';
  objectLabel.style.fontWeight = 'bold';
  objectLabel.style.fontSize = '14px';
  objectLabel.style.textAlign = 'left';
  objectLabel.style.width = '100%';
  const objectInput = document.createElement('input');
  objectInput.type = 'text';
  objectInput.placeholder = 'e.g. text on shirt, logo, background color...';
  objectInput.style.padding = '6px 12px';
  objectInput.style.fontSize = '15px';
  objectInput.style.borderRadius = '6px';
  objectInput.style.border = '1px solid #888';
  objectInput.style.width = '100%';
  promptCol1.appendChild(objectLabel);
  promptCol1.appendChild(objectInput);

  // Col 2: Replacement content
  const promptCol2 = document.createElement('div');
  promptCol2.style.display = 'flex';
  promptCol2.style.flexDirection = 'column';
  promptCol2.style.gap = '4px';
  promptCol2.style.flex = '1';
  const contentLabel = document.createElement('label');
  contentLabel.textContent = 'Replacement content:';
  contentLabel.style.fontWeight = 'bold';
  contentLabel.style.fontSize = '14px';
  contentLabel.style.textAlign = 'left';
  contentLabel.style.width = '100%';
  const contentInput = document.createElement('input');
  contentInput.type = 'text';
  contentInput.placeholder = 'e.g. new text, new logo, new color...';
  contentInput.style.padding = '6px 12px';
  contentInput.style.fontSize = '15px';
  contentInput.style.borderRadius = '6px';
  contentInput.style.border = '1px solid #888';
  contentInput.style.width = '100%';
  promptCol2.appendChild(contentLabel);
  promptCol2.appendChild(contentInput);

  // Add 2 columns to promptWrap
  promptWrap.appendChild(promptCol1);
  promptWrap.appendChild(promptCol2);

  // Show/hide prompt when selecting mode
  modeSelect.addEventListener('change', function() {
    if (modeSelect.value === 'custom') {
      promptWrap.style.display = 'flex';
    } else {
      promptWrap.style.display = 'none';
    }
  });

  // Create 2 rows for input
  // Row 1: Provider, Model, Mode
  const row1 = document.createElement('div');
  row1.style.display = 'flex';
  row1.style.gap = '24px';
  row1.style.alignItems = 'flex-end';
  row1.appendChild(providerWrap);
  row1.appendChild(modelWrap);
  row1.appendChild(modeWrap);

  // Row 2: Object to replace, Replacement content
  const row2 = document.createElement('div');
  row2.style.display = 'flex';
  row2.style.gap = '24px';
  row2.style.alignItems = 'flex-end';
  row2.appendChild(promptWrap);

  // Remove old appendChild of leftTopGroup
  leftTopGroup.appendChild(row1);
  leftTopGroup.appendChild(row2);
  topBar.appendChild(leftTopGroup);

  // RUN, Cancel, Download buttons in a row, evenly spaced
  const runBtn = document.createElement('button');
  runBtn.textContent = 'RUN';
  runBtn.style.height = '48px';
  runBtn.style.padding = '0 28px';
  runBtn.style.display = 'flex';
  runBtn.style.alignItems = 'center';
  runBtn.style.justifyContent = 'center';
  runBtn.style.borderRadius = '8px';
  runBtn.style.fontWeight = 'bold';
  runBtn.style.fontSize = '18px';
  runBtn.style.border = '2.5px solid #ff9800';
  runBtn.style.background = '#ff9800';
  runBtn.style.color = '#fff';
  runBtn.style.cursor = 'pointer';
  runBtn.style.margin = '0';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.height = '48px';
  cancelBtn.style.padding = '0 28px';
  cancelBtn.style.display = 'flex';
  cancelBtn.style.alignItems = 'center';
  cancelBtn.style.justifyContent = 'center';
  cancelBtn.style.borderRadius = '8px';
  cancelBtn.style.fontWeight = 'bold';
  cancelBtn.style.fontSize = '18px';
  cancelBtn.style.border = '2.5px solid #ff9800';
  cancelBtn.style.background = '#ff9800';
  cancelBtn.style.color = '#fff';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.style.margin = '0';

  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download';
  downloadBtn.style.height = '48px';
  downloadBtn.style.padding = '0 28px';
  downloadBtn.style.display = 'flex';
  downloadBtn.style.alignItems = 'center';
  downloadBtn.style.justifyContent = 'center';
  downloadBtn.style.borderRadius = '8px';
  downloadBtn.style.fontWeight = 'bold';
  downloadBtn.style.fontSize = '18px';
  downloadBtn.style.border = '2.5px solid #ff9800';
  downloadBtn.style.background = '#ff9800';
  downloadBtn.style.color = '#fff';
  downloadBtn.style.cursor = 'pointer';
  downloadBtn.style.margin = '0';

  const topBtnGroup = document.createElement('div');
  topBtnGroup.style.display = 'flex';
  topBtnGroup.style.gap = '18px';
  topBtnGroup.style.alignItems = 'center';
  topBtnGroup.style.marginLeft = '16px';

  topBtnGroup.appendChild(runBtn);
  topBtnGroup.appendChild(cancelBtn);
  topBtnGroup.appendChild(downloadBtn);
  topBar.appendChild(topBtnGroup);
  popup.appendChild(topBar);

  // Container centering 2 image frames both horizontally and vertically, moved up
  const centerContainer = document.createElement('div');
  centerContainer.style.flex = '1';
  centerContainer.style.display = 'flex';
  centerContainer.style.justifyContent = 'center';
  centerContainer.style.alignItems = 'flex-start';
  centerContainer.style.width = '100%';
  centerContainer.style.height = '100%';
  centerContainer.style.marginTop = '10px'; // dịch lên trên
  centerContainer.style.marginBottom = '60px'; // increase distance from bottom bar

  // 2 columns: Original image - Result
  const mainContent = document.createElement('div');
  mainContent.style.display = 'flex';
  mainContent.style.flexDirection = 'row';
  mainContent.style.justifyContent = 'center';
  mainContent.style.alignItems = 'center';
  mainContent.style.gap = '60px';
  mainContent.style.width = 'auto';
  mainContent.style.height = 'auto';

  // Left column: Original image
  const leftColWrap = document.createElement('div');
  leftColWrap.style.display = 'flex';
  leftColWrap.style.flexDirection = 'column';
  leftColWrap.style.alignItems = 'center';
  leftColWrap.style.justifyContent = 'center';
  leftColWrap.style.height = '100%';

  const leftTitle = document.createElement('div');
  leftTitle.textContent = 'ORIGINAL';
  leftTitle.style.fontWeight = 'bold';
  leftTitle.style.fontSize = '22px';
  leftTitle.style.marginBottom = '16px';
  leftTitle.style.letterSpacing = '2px';
  leftColWrap.appendChild(leftTitle);

  const leftCol = document.createElement('div');
  leftCol.style.width = '700px';
  leftCol.style.height = '700px';
  leftCol.style.background = 'none';
  leftCol.style.display = 'flex';
  leftCol.style.alignItems = 'center';
  leftCol.style.justifyContent = 'center';
  leftCol.style.border = '2.5px solid #bbb';
  leftCol.style.position = 'relative';
  leftCol.style.fontSize = '28px';
  leftCol.style.fontWeight = 'bold';
  leftCol.style.color = '#222';
  leftCol.style.textAlign = 'center';
  if (isError) {
    leftCol.textContent = 'ERROR';
  } else if (dataUrl) {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    leftCol.appendChild(img);
  } else {
    leftCol.textContent = '';
  }
  leftColWrap.appendChild(leftCol);

  // Right column: Result
  const rightColWrap = document.createElement('div');
  rightColWrap.style.display = 'flex';
  rightColWrap.style.flexDirection = 'column';
  rightColWrap.style.alignItems = 'center';
  rightColWrap.style.justifyContent = 'center';
  rightColWrap.style.height = '100%';

  const rightTitle = document.createElement('div');
  rightTitle.textContent = 'PROCESSED';
  rightTitle.style.fontWeight = 'bold';
  rightTitle.style.fontSize = '22px';
  rightTitle.style.marginBottom = '16px';
  rightTitle.style.letterSpacing = '2px';
  rightColWrap.appendChild(rightTitle);

  const rightCol = document.createElement('div');
  rightCol.style.width = '700px';
  rightCol.style.height = '700px';
  rightCol.style.background = 'none';
  rightCol.style.display = 'flex';
  rightCol.style.alignItems = 'center';
  rightCol.style.justifyContent = 'center';
  rightCol.style.border = '2.5px solid #bbb';
  rightCol.style.position = 'relative';
  rightCol.style.fontSize = '28px';
  rightCol.style.fontWeight = 'bold';
  rightCol.style.color = '#222';
  rightCol.style.textAlign = 'center';
  let resultImg = null;
  if (isError) {
    rightCol.textContent = 'ERROR';
  } else {
    resultImg = document.createElement('img');
    resultImg.style.maxWidth = '100%';
    resultImg.style.maxHeight = '100%';
    resultImg.style.objectFit = 'contain';
    resultImg.style.display = 'none';
    rightCol.appendChild(resultImg);
  }
  rightColWrap.appendChild(rightCol);

  mainContent.appendChild(leftColWrap);
  mainContent.appendChild(rightColWrap);
  centerContainer.appendChild(mainContent);
  popup.appendChild(centerContainer);

  // Replace bottomBar with color selection panel, title on the left of color boxes
  const colorBarWrap = document.createElement('div');
  colorBarWrap.style.display = 'flex';
  colorBarWrap.style.flexDirection = 'row';
  colorBarWrap.style.alignItems = 'center';
  colorBarWrap.style.position = 'absolute';
  colorBarWrap.style.right = '32px';
  colorBarWrap.style.bottom = '32px';
  colorBarWrap.style.zIndex = '10';

  const colorBarTitle = document.createElement('div');
  colorBarTitle.textContent = 'Background:';
  colorBarTitle.style.fontWeight = 'bold';
  colorBarTitle.style.fontSize = '16px';
  colorBarTitle.style.color = '#333';
  colorBarTitle.style.marginRight = '16px';
  colorBarWrap.appendChild(colorBarTitle);

  const colorBar = document.createElement('div');
  colorBar.style.display = 'flex';
  colorBar.style.justifyContent = 'flex-end';
  colorBar.style.gap = '14px';

  // 7 basic colors
  const colors = ['#ffffff', '#000000', '#888888', '#ff9800', '#2196f3', '#4caf50', '#e91e63', '#f44336'];
  colors.forEach(color => {
    const colorBtn = document.createElement('button');
    colorBtn.style.width = '16px';
    colorBtn.style.height = '24px';
    colorBtn.style.borderRadius = '0'; // vertical rectangle
    colorBtn.style.border = '2.5px solid #888';
    colorBtn.style.background = color;
    colorBtn.style.cursor = 'pointer';
    colorBtn.style.margin = '0';
    colorBtn.title = color;
    colorBtn.onclick = () => {
      rightCol.style.background = color;
    };
    colorBar.appendChild(colorBtn);
  });
  colorBarWrap.appendChild(colorBar);
  popup.appendChild(colorBarWrap);

  // Handle RUN button
  runBtn.onclick = async function() {
    runBtn.disabled = true;
    runBtn.textContent = 'Processing...';
    downloadBtn.disabled = true;
    if (resultImg) {
      resultImg.style.display = 'none';
    }
    // Send image to backend API
    try {
      const blob = dataURLtoBlob(dataUrl);
      const formData = new FormData();
      formData.append('file', blob, 'capture.png');
      // API key will be handled at backend, no need to send from frontend
      let modelToSend = modelSelect.value;
      if (providerSelect.value === 'gemini') {
        modelToSend = 'gpt-4.1';
      }
      formData.append('model', modelToSend);
      formData.append('size', '4500');
      let customPrompt = '';
      if (modeSelect.value === 'custom') {
        customPrompt = `Replace ${objectInput.value || '[object]'} with ${contentInput.value || '[new content]'}.`;
      }
      formData.append('prompt', customPrompt);
      formData.append('mode', modeSelect.value); // send mode to API
      const res = await fetch('https://jeg-redesign.onrender.com/extract-design', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.image_base64) {
        resultImg.src = 'data:image/png;base64,' + data.image_base64;
        resultImg.style.display = 'block';
        downloadBtn.disabled = false;
        lastResultImgBase64 = 'data:image/png;base64,' + data.image_base64;
      } else {
        alert(data.error || 'Unknown error!');
      }
    } catch (err) {
      console.error('Error processing image:', err);
      rightCol.innerHTML = '';
      rightCol.textContent = 'Processing Error';
      
      // More detailed error message
      let errorMessage = 'Image processing error: ';
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage += 'Cannot connect to image processing server. Please try again later.';
      } else if (err.message.includes('400')) {
        errorMessage += 'Invalid image format.';
      } else if (err.message.includes('500')) {
        errorMessage += 'Image processing server encountered an error.';
      } else {
        errorMessage += err.message;
      }
      
      showErrorNotification(errorMessage, 5000);
    }
    runBtn.disabled = false;
    runBtn.textContent = 'RUN';
  };

  cancelBtn.disabled = false;
  cancelBtn.onclick = () => bg.remove();

  downloadBtn.disabled = true;
  downloadBtn.onclick = () => {
    if (resultImg && resultImg.src && resultImg.style.display !== 'none') {
      const a = document.createElement('a');
      a.href = resultImg.src;
      a.download = 'design.png';
      a.click();
    }
  };

  // Add Create Mockup button
  const mockupBtn = document.createElement('button');
  mockupBtn.textContent = 'Create Mockup';
  mockupBtn.style.height = '48px';
  mockupBtn.style.padding = '0 28px';
  mockupBtn.style.display = 'flex';
  mockupBtn.style.alignItems = 'center';
  mockupBtn.style.justifyContent = 'center';
  mockupBtn.style.borderRadius = '8px';
  mockupBtn.style.fontWeight = 'bold';
  mockupBtn.style.fontSize = '18px';
  mockupBtn.style.border = '2.5px solid #ff9800';
  mockupBtn.style.background = '#ff9800';
  mockupBtn.style.color = '#fff';
  mockupBtn.style.cursor = 'pointer';
  mockupBtn.style.margin = '0';
  topBtnGroup.appendChild(mockupBtn);

  // Variable to store result image base64
  let lastResultImgBase64 = null;

  // Handle Create Mockup button
  mockupBtn.onclick = function() {
    // Hide old popup, show mockup popup
    bg.style.display = 'none';
    showMockupPopup(lastResultImgBase64, dataUrl);
  };

  // Function to show mockup popup
  function showMockupPopup(designBase64, originalImageBase64) {
    // Remove old mockup popup if exists
    const oldMockup = document.getElementById('jeg-mockup-popup-bg');
    if (oldMockup) oldMockup.remove();
    // Create new popup
    const mockupBg = document.createElement('div');
    mockupBg.id = 'jeg-mockup-popup-bg';
    mockupBg.style.position = 'fixed';
    mockupBg.style.left = '0';
    mockupBg.style.top = '0';
    mockupBg.style.right = '0';
    mockupBg.style.bottom = '0';
    mockupBg.style.zIndex = '1000001';
    mockupBg.style.background = 'rgba(0,0,0,0.45)';
    mockupBg.style.display = 'flex';
    mockupBg.style.alignItems = 'center';
    mockupBg.style.justifyContent = 'center';

    const popup = document.createElement('div');
    popup.style.background = '#eee';
    popup.style.border = '1px solid #888';
    popup.style.borderRadius = '8px';
    popup.style.padding = '0';
    popup.style.width = '1500px';
    popup.style.maxWidth = '99vw';
    popup.style.height = '950px';
    popup.style.maxHeight = '99vh';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.boxSizing = 'border-box';
    popup.style.position = 'relative';
    popup.style.justifyContent = 'space-between';

    // Mockup settings bar at the top
    const topBar = document.createElement('div');
    topBar.style.display = 'flex';
    topBar.style.justifyContent = 'space-between';
    topBar.style.alignItems = 'center';
    topBar.style.height = '80px';
    topBar.style.padding = '16px 16px 0 16px';
    topBar.style.boxSizing = 'border-box';
    topBar.style.width = '100%';

    // Left side: Title and template selection
    const leftTopGroup = document.createElement('div');
    leftTopGroup.style.display = 'flex';
    leftTopGroup.style.gap = '24px';
    leftTopGroup.style.alignItems = 'center';

    // Title
    // const title = document.createElement('div');
    // title.textContent = 'CREATE T-SHIRT MOCKUP';
    // title.style.fontWeight = 'bold';
    // title.style.fontSize = '22px';
    // title.style.letterSpacing = '2px';
    // leftTopGroup.appendChild(title);

    // --- Replace template dropdown with mockup selection button ---
    let selectedMockup = null;
    let selectedSmartObject = null; // Add variable to store smart object
    const selectMockupBtn = document.createElement('button');
    selectMockupBtn.textContent = 'Select mockup template';
    selectMockupBtn.style.padding = '8px 18px';
    selectMockupBtn.style.fontSize = '16px';
    selectMockupBtn.style.borderRadius = '6px';
    selectMockupBtn.style.border = '1.5px solid #888';
    selectMockupBtn.style.background = '#fff';
    selectMockupBtn.style.cursor = 'pointer';
    selectMockupBtn.style.marginLeft = '12px';
    selectMockupBtn.onclick = function() {
      showMockupSelectPopup();
    };
    leftTopGroup.appendChild(selectMockupBtn);

    // Function to show mockup selection popup
    function showMockupSelectPopup() {
      const old = document.getElementById('jeg-mockup-select-popup');
      if (old) old.remove();
      const overlay = document.createElement('div');
      overlay.id = 'jeg-mockup-select-popup';
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.background = 'rgba(0,0,0,0.4)';
      overlay.style.zIndex = '1000002';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      const popup = document.createElement('div');
      popup.style.background = '#fff';
      popup.style.borderRadius = '10px';
      popup.style.padding = '32px';
      popup.style.minWidth = '700px';
      popup.style.maxWidth = '90vw';
      popup.style.maxHeight = '80vh';
      popup.style.overflowY = 'auto';
      popup.style.boxShadow = '0 4px 32px rgba(0,0,0,0.18)';
      const title = document.createElement('div');
      title.textContent = 'Select mockup template';
      title.style.fontWeight = 'bold';
      title.style.fontSize = '22px';
      title.style.marginBottom = '24px';
      popup.appendChild(title);

      // Add custom mockup upload section
      const uploadSection = document.createElement('div');
      uploadSection.style.marginBottom = '32px';
      uploadSection.style.padding = '20px';
      uploadSection.style.border = '2px dashed #ccc';
      uploadSection.style.borderRadius = '8px';
      uploadSection.style.backgroundColor = '#f9f9f9';
      uploadSection.style.textAlign = 'center';

      const uploadTitle = document.createElement('div');
      uploadTitle.textContent = 'Upload your mockup template';
      uploadTitle.style.fontWeight = 'bold';
      uploadTitle.style.fontSize = '16px';
      uploadTitle.style.marginBottom = '12px';
      uploadTitle.style.color = '#333';
      uploadSection.appendChild(uploadTitle);

      const uploadDesc = document.createElement('div');
      uploadDesc.textContent = 'Select mockup image file (PNG/JPG) with empty area to attach design';
      uploadDesc.style.fontSize = '14px';
      uploadDesc.style.color = '#666';
      uploadDesc.style.marginBottom = '16px';
      uploadSection.appendChild(uploadDesc);

      // Hidden file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.id = 'custom-mockup-input';

      // Upload button
      const uploadBtn = document.createElement('button');
      uploadBtn.textContent = '📁 Select mockup file';
      uploadBtn.style.padding = '12px 24px';
      uploadBtn.style.fontSize = '14px';
      uploadBtn.style.fontWeight = 'bold';
      uploadBtn.style.border = '2px solid #4CAF50';
      uploadBtn.style.background = '#4CAF50';
      uploadBtn.style.color = 'white';
      uploadBtn.style.borderRadius = '6px';
      uploadBtn.style.cursor = 'pointer';
      uploadBtn.style.transition = 'all 0.2s';
      uploadBtn.onmouseover = () => {
        uploadBtn.style.background = '#45a049';
        uploadBtn.style.borderColor = '#45a049';
      };
      uploadBtn.onmouseout = () => {
        uploadBtn.style.background = '#4CAF50';
        uploadBtn.style.borderColor = '#4CAF50';
      };
      uploadBtn.onclick = () => fileInput.click();

      uploadSection.appendChild(fileInput);
      uploadSection.appendChild(uploadBtn);

      // Preview area for uploaded mockup
      const previewArea = document.createElement('div');
      previewArea.style.marginTop = '16px';
      previewArea.style.display = 'none';
      previewArea.style.textAlign = 'center';

      const previewImg = document.createElement('img');
      previewImg.style.maxWidth = '200px';
      previewImg.style.maxHeight = '200px';
      previewImg.style.borderRadius = '8px';
      previewImg.style.border = '2px solid #ddd';
      previewImg.style.objectFit = 'cover';

      const previewText = document.createElement('div');
      previewText.style.marginTop = '8px';
      previewText.style.fontSize = '14px';
      previewText.style.color = '#666';

      const useCustomBtn = document.createElement('button');
      useCustomBtn.textContent = '✓ Use this mockup';
      useCustomBtn.style.marginTop = '12px';
      useCustomBtn.style.padding = '8px 16px';
      useCustomBtn.style.fontSize = '14px';
      useCustomBtn.style.fontWeight = 'bold';
      useCustomBtn.style.border = '2px solid #2196F3';
      useCustomBtn.style.background = '#2196F3';
      useCustomBtn.style.color = 'white';
      useCustomBtn.style.borderRadius = '6px';
      useCustomBtn.style.cursor = 'pointer';

      previewArea.appendChild(previewImg);
      previewArea.appendChild(previewText);
      previewArea.appendChild(useCustomBtn);
      uploadSection.appendChild(previewArea);

      // Handle file selection
      fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Please select an image file (PNG, JPG, etc.)');
          return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('File too large! Please select a file smaller than 10MB');
          return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
          const imageDataUrl = e.target.result;
          previewImg.src = imageDataUrl;
          previewText.textContent = `${file.name} (${Math.round(file.size / 1024)}KB)`;
          previewArea.style.display = 'block';
          
          uploadBtn.textContent = '✓ File selected - Choose another file';
          uploadBtn.style.background = '#45a049';
          uploadBtn.style.borderColor = '#45a049';

          // Handle use custom mockup
          useCustomBtn.onclick = () => {
            // Set custom mockup data
            selectedMockup = {
              uuid: 'custom-' + Date.now(),
              thumbnail: imageDataUrl,
              isCustom: true,
              originalFile: file,
              imageData: imageDataUrl
            };
            
            // Create a mock smart object for custom mockup
            selectedSmartObject = {
              uuid: 'custom-smart-object',
              isCustom: true
            };
            
            selectMockupBtn.textContent = 'Selected: Custom mockup';
            console.log('Selected custom mockup:', selectedMockup);
            
            // Display custom mockup in result frame
            rightCol.innerHTML = '';
            const mockupPreview = document.createElement('img');
            mockupPreview.src = imageDataUrl;
            mockupPreview.style.maxWidth = '100%';
            mockupPreview.style.maxHeight = '100%';
            mockupPreview.style.objectFit = 'contain';
            mockupPreview.style.opacity = '1';
            mockupPreview.id = 'mockup-preview';
            rightCol.appendChild(mockupPreview);
            
            overlay.remove();
          };
        };
        reader.readAsDataURL(file);
      };

      popup.appendChild(uploadSection);

      // Divider
      const divider = document.createElement('div');
      divider.style.height = '1px';
      divider.style.background = '#ddd';
      divider.style.margin = '24px 0';
      popup.appendChild(divider);

      // Template section title
      const templateTitle = document.createElement('div');
      templateTitle.textContent = 'Or select from available template library:';
      templateTitle.style.fontWeight = 'bold';
      templateTitle.style.fontSize = '16px';
      templateTitle.style.marginBottom = '16px';
      templateTitle.style.color = '#333';
      popup.appendChild(templateTitle);
      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexWrap = 'wrap';
      list.style.gap = '24px';
      fetchMockupTemplates()
        .then(res => {
          console.log('Mockup response:', res);
          const mockups = res.data.data;
          mockups.forEach(m => {
            const item = document.createElement('div');
            item.style.width = '160px';
            item.style.cursor = 'pointer';
            item.style.border = '2px solid #eee';
            item.style.borderRadius = '8px';
            item.style.padding = '10px';
            item.style.display = 'flex';
            item.style.flexDirection = 'column';
            item.style.alignItems = 'center';
            item.style.transition = 'border 0.2s';
            item.onmouseover = () => item.style.border = '2px solid #2196f3';
            item.onmouseout = () => item.style.border = '2px solid #eee';
            const img = document.createElement('img');
            img.src = m.thumbnail;
            img.style.width = '120px';
            img.style.height = '120px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '6px';
            img.style.marginBottom = '10px';
            item.appendChild(img);
            item.onclick = () => {
              selectedMockup = m;
              
              // Get first smart object (or allow selection if multiple)
              if (m.smart_objects && m.smart_objects.length > 0) {
                selectedSmartObject = m.smart_objects[0]; // Get the first one
                selectMockupBtn.textContent = 'Template selected';
                console.log('Selected mockup:', m);
                console.log('Selected smart object:', selectedSmartObject);
                
                // Display selected mockup template in result frame
                rightCol.innerHTML = '';
                const mockupPreview = document.createElement('img');
                mockupPreview.src = m.thumbnail;
                mockupPreview.style.maxWidth = '100%';
                mockupPreview.style.maxHeight = '100%';
                mockupPreview.style.objectFit = 'contain';
                mockupPreview.style.opacity = '1';
                mockupPreview.id = 'mockup-preview';
                rightCol.appendChild(mockupPreview);
                
              } else {
                alert('This mockup has no position to attach design!');
                return;
              }
              
              overlay.remove();
            };
            list.appendChild(item);
          });
        })
        .catch(err => {
          console.error('Error fetching mockup:', err);
          list.textContent = 'Could not get mockup list: ' + err.message;
        });
      popup.appendChild(list);
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.marginTop = '24px';
      closeBtn.style.padding = '8px 24px';
      closeBtn.style.borderRadius = '6px';
      closeBtn.style.border = '1.5px solid #888';
      closeBtn.style.background = '#fff';
      closeBtn.style.cursor = 'pointer';
      closeBtn.onclick = () => overlay.remove();
      popup.appendChild(closeBtn);
      overlay.appendChild(popup);
      document.body.appendChild(overlay);
    }

    topBar.appendChild(leftTopGroup);

    // Right side: Create and back buttons
    const rightTopGroup = document.createElement('div');
    rightTopGroup.style.display = 'flex';
    rightTopGroup.style.gap = '18px';
    rightTopGroup.style.alignItems = 'center';

    // Create mockup button
    const createBtn = document.createElement('button');
    createBtn.textContent = 'CREATE MOCKUP';
    createBtn.style.height = '48px';
    createBtn.style.padding = '0 28px';
    createBtn.style.borderRadius = '8px';
    createBtn.style.fontWeight = 'bold';
    createBtn.style.fontSize = '18px';
    createBtn.style.border = '2.5px solid #ff9800';
    createBtn.style.background = '#ff9800';
    createBtn.style.color = '#fff';
    createBtn.style.cursor = 'pointer';
    createBtn.style.margin = '0';
    rightTopGroup.appendChild(createBtn);

    // Back button
    const backBtn = document.createElement('button');
    backBtn.textContent = 'BACK';
    backBtn.style.height = '48px';
    backBtn.style.padding = '0 28px';
    backBtn.style.borderRadius = '8px';
    backBtn.style.fontWeight = 'bold';
    backBtn.style.fontSize = '18px';
    backBtn.style.border = '2.5px solid #888';
    backBtn.style.background = '#fff';
    backBtn.style.color = '#333';
    backBtn.style.cursor = 'pointer';
    backBtn.style.margin = '0';
    rightTopGroup.appendChild(backBtn);

    topBar.appendChild(rightTopGroup);
    popup.appendChild(topBar);

    // Main container: 2 parallel columns
    const mainContainer = document.createElement('div');
    mainContainer.style.flex = '1';
    mainContainer.style.display = 'flex';
    mainContainer.style.justifyContent = 'center';
    mainContainer.style.alignItems = 'flex-start';
    mainContainer.style.width = '100%';
    mainContainer.style.height = '100%';
    mainContainer.style.marginTop = '10px';
    mainContainer.style.marginBottom = '60px';

    // 2 columns: Original design - Mockup result
    const mainContent = document.createElement('div');
    mainContent.style.display = 'flex';
    mainContent.style.flexDirection = 'row';
    mainContent.style.justifyContent = 'center';
    mainContent.style.alignItems = 'center';
    mainContent.style.gap = '60px';
    mainContent.style.width = 'auto';
    mainContent.style.height = 'auto';

    // Left column: Extracted design
    const leftColWrap = document.createElement('div');
    leftColWrap.style.display = 'flex';
    leftColWrap.style.flexDirection = 'column';
    leftColWrap.style.alignItems = 'center';
    leftColWrap.style.justifyContent = 'center';
    leftColWrap.style.height = '100%';

    const leftTitle = document.createElement('div');
    leftTitle.textContent = 'DESIGN';
    leftTitle.style.fontWeight = 'bold';
    leftTitle.style.fontSize = '22px';
    leftTitle.style.marginBottom = '16px';
    leftTitle.style.letterSpacing = '2px';
    leftColWrap.appendChild(leftTitle);

    const leftCol = document.createElement('div');
    leftCol.style.width = '700px';
    leftCol.style.height = '700px';
    leftCol.style.background = 'none';
    leftCol.style.display = 'flex';
    leftCol.style.alignItems = 'center';
    leftCol.style.justifyContent = 'center';
    leftCol.style.border = '2.5px solid #bbb';
    leftCol.style.position = 'relative';
    leftCol.style.fontSize = '28px';
    leftCol.style.fontWeight = 'bold';
    leftCol.style.color = '#222';
    leftCol.style.textAlign = 'center';
    if (designBase64) {
      const img = document.createElement('img');
      img.src = designBase64;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      leftCol.appendChild(img);
    } else {
      leftCol.textContent = 'None';
    }
    leftColWrap.appendChild(leftCol);

    // Right column: Mockup result
    const rightColWrap = document.createElement('div');
    rightColWrap.style.display = 'flex';
    rightColWrap.style.flexDirection = 'column';
    rightColWrap.style.alignItems = 'center';
    rightColWrap.style.justifyContent = 'center';
    rightColWrap.style.height = '100%';

    const rightTitle = document.createElement('div');
    rightTitle.textContent = 'RESULT';
    rightTitle.style.fontWeight = 'bold';
    rightTitle.style.fontSize = '22px';
    rightTitle.style.marginBottom = '16px';
    rightTitle.style.letterSpacing = '2px';
    rightColWrap.appendChild(rightTitle);

    const rightCol = document.createElement('div');
    rightCol.style.width = '700px';
    rightCol.style.height = '700px';
    rightCol.style.background = 'none';
    rightCol.style.display = 'flex';
    rightCol.style.alignItems = 'center';
    rightCol.style.justifyContent = 'center';
    rightCol.style.border = '2.5px solid #bbb';
    rightCol.style.position = 'relative';
    rightCol.style.fontSize = '28px';
    rightCol.style.fontWeight = 'bold';
    rightCol.style.color = '#222';
    rightCol.style.textAlign = 'center';
    rightCol.textContent = '--';
    rightColWrap.appendChild(rightCol);

    mainContent.appendChild(leftColWrap);
    mainContent.appendChild(rightColWrap);
    mainContainer.appendChild(mainContent);
    popup.appendChild(mainContainer);



    // Save product button (hidden initially)
    const saveProductBtn = document.createElement('button');
    saveProductBtn.textContent = 'SAVE PRODUCT';
    saveProductBtn.style.height = '48px';
    saveProductBtn.style.padding = '0 28px';
    saveProductBtn.style.borderRadius = '8px';
    saveProductBtn.style.fontWeight = 'bold';
    saveProductBtn.style.fontSize = '18px';
    saveProductBtn.style.border = '2.5px solid #4caf50';
    saveProductBtn.style.background = '#4caf50';
    saveProductBtn.style.color = '#fff';
    saveProductBtn.style.cursor = 'pointer';
    saveProductBtn.style.margin = '0';
    saveProductBtn.style.display = 'none';
    rightTopGroup.appendChild(saveProductBtn);

    // Handle Back button
    backBtn.onclick = function() {
      mockupBg.remove();
      bg.style.display = 'flex';
    };

    // Handle Create Mockup button 
    createBtn.onclick = function() {
      if (!selectedMockup || !selectedSmartObject) {
        alert('Please select a mockup template first!');
        return;
      }
      
      if (!designBase64) {
        alert('No design available to create mockup!');
        return;
      }
      
      createBtn.disabled = true;
      createBtn.textContent = 'Creating mockup...';
      
      // Show loading on mockup template
      const mockupPreview = document.getElementById('mockup-preview');
      if (mockupPreview) {
        mockupPreview.style.opacity = '0.3'; // Make transparent
        
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.style.position = 'absolute';
        loadingOverlay.style.top = '50%';
        loadingOverlay.style.left = '50%';
        loadingOverlay.style.transform = 'translate(-50%, -50%)';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.flexDirection = 'column';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.gap = '12px';
        
        // Loading spinner
        const spinner = document.createElement('div');
        spinner.style.width = '40px';
        spinner.style.height = '40px';
        spinner.style.border = '4px solid #f3f3f3';
        spinner.style.borderTop = '4px solid #ff9800';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'spin 1s linear infinite';
        
        // Loading text
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Creating mockup...';
        loadingText.style.fontWeight = 'bold';
        loadingText.style.fontSize = '16px';
        loadingText.style.color = '#333';
        loadingText.id = 'loading-text';
        
        loadingOverlay.appendChild(spinner);
        loadingOverlay.appendChild(loadingText);
        rightCol.style.position = 'relative';
        rightCol.appendChild(loadingOverlay);
        
        // Add CSS animation for spinner
        if (!document.getElementById('spinner-style')) {
          const style = document.createElement('style');
          style.id = 'spinner-style';
          style.textContent = `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(style);
        }
      }
      
      // Check if it's a custom mockup
      if (selectedMockup.isCustom) {
        // Handle custom mockup - direct composite
        handleCustomMockup();
      } else {
        // Handle mockup from API
        handleAPIMockup();
      }

      function handleCustomMockup() {
        try {
          // Update loading text
          const loadingText = document.getElementById('loading-text');
          if (loadingText) {
            loadingText.textContent = 'Compositing design...';
          }

          // Create composite mockup by overlaying design on custom mockup
          createCustomMockupComposite(selectedMockup.imageData, designBase64)
            .then(compositeResult => {
              console.log('Custom mockup created successfully');
              
              // Remove loading overlay
              const loadingOverlay = document.getElementById('loading-overlay');
              if (loadingOverlay) {
                loadingOverlay.remove();
              }
              
              // Display result mockup
              const mockupImg = document.createElement('img');
              mockupImg.src = compositeResult;
              mockupImg.style.maxWidth = '100%';
              mockupImg.style.maxHeight = '100%';
              mockupImg.style.objectFit = 'contain';
              mockupImg.style.opacity = '1';
              
              rightCol.innerHTML = ''; // Clear old content
              rightCol.appendChild(mockupImg);
              
              // Show save product button
              saveProductBtn.style.display = 'block';
              saveProductBtn.onclick = () => {
                // With custom mockup, we use composite result
                saveProductData(designBase64, compositeResult, originalImageBase64);
              };
              
              createBtn.disabled = false;
              createBtn.textContent = 'CREATE MOCKUP';
            })
            .catch(err => {
              throw err;
            });
            
        } catch (err) {
          alert('Error creating custom mockup: ' + err.message);
          
          // Remove loading overlay and restore opacity
          const loadingOverlay = document.getElementById('loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.remove();
          }
          const mockupPreview = document.getElementById('mockup-preview');
          if (mockupPreview) {
            mockupPreview.style.opacity = '1';
          }
          
          createBtn.disabled = false;
          createBtn.textContent = 'CREATE MOCKUP';
        }
      }

      function handleAPIMockup() {
        // API Keys
        const imgbbApiKey = 'b248161838895d85e5ac6884c5f0de07';
        const dynamicMockupsApiKey = '79d70e34-104c-493c-8553-723102e37207:f1afba7b448fe18ec304c8c71a0768f5756e3973b50bcd7745f6815be4e2f1ef';
        
        // Upload image to ImgBB first
        uploadImageToImgBB(designBase64, imgbbApiKey)
          .then(imageUrl => {
            console.log('Image uploaded successfully:', imageUrl);
            createBtn.textContent = 'Creating mockup...';
            
            // Update loading text
            const loadingText = document.getElementById('loading-text');
            if (loadingText) {
              loadingText.textContent = 'Rendering mockup...';
            }
            
            // Call DynamicMockups API to render mockup
            return renderMockup(selectedMockup.uuid, selectedSmartObject.uuid, imageUrl, dynamicMockupsApiKey, selectedSmartObject);
          })
          .then(mockupUrl => {
            console.log('Mockup created successfully:', mockupUrl);
            
            // Remove loading overlay
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
              loadingOverlay.remove();
            }
            
            // Display actual mockup result
            const mockupImg = document.createElement('img');
            mockupImg.src = mockupUrl;
            mockupImg.style.maxWidth = '100%';
            mockupImg.style.maxHeight = '100%';
            mockupImg.style.objectFit = 'contain';
            mockupImg.style.opacity = '1';
            
            rightCol.innerHTML = ''; // Clear old content
            rightCol.appendChild(mockupImg);
            
            // Show save product button
            saveProductBtn.style.display = 'block';
            saveProductBtn.onclick = () => {
              // designBase64: processed design image
              // mockupUrl: newly created mockup URL
              // originalImageBase64: original cropped image from design popup
              saveProductData(designBase64, mockupUrl, originalImageBase64);
            };
            
            createBtn.disabled = false;
            createBtn.textContent = 'CREATE MOCKUP';
          })
          .catch(err => {
            alert('Error: ' + err.message);
            
            // Remove loading overlay and restore opacity
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
              loadingOverlay.remove();
            }
            const mockupPreview = document.getElementById('mockup-preview');
            if (mockupPreview) {
              mockupPreview.style.opacity = '1';
            }
            
            createBtn.disabled = false;
            createBtn.textContent = 'CREATE MOCKUP';
          });
      }
    };

    document.body.appendChild(mockupBg);
    mockupBg.appendChild(popup);
  }

  bg.appendChild(popup);
  document.body.appendChild(bg);
}

// Hàm chuyển dataURL sang Blob
function dataURLtoBlob(dataurl) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
}

// === PRODUCT SCRAPING SYSTEM ===

// Platform detection
function detectPlatform() {
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('amazon.')) return 'amazon';
  if (hostname.includes('etsy.')) return 'etsy';
  if (document.querySelector('script[src*="shopify"]') || 
      document.querySelector('meta[name="generator"][content*="Shopify"]') ||
      document.querySelector('script[src*="shopify-analytics"]') ||
      document.querySelector('link[href*="shopify"]')) {
    return 'shopify';
  }
  
  return 'unknown';
}

// Platform-specific selectors
const PLATFORM_SELECTORS = {
  amazon: {
    title: '#productTitle',
    price: '.a-price-whole, .a-price .a-offscreen',
    originalPrice: '.a-price.a-text-price .a-offscreen',
    rating: '.a-icon-alt',
    reviewCount: '#acrCustomerReviewText',
    shop: '#bylineInfo',
    description: 'ul.a-unordered-list.a-vertical.a-spacing-small, #feature-bullets ul, #productDescription',
    images: '#landingImage, .a-dynamic-image'
  },
  
  etsy: {
    title: '[data-test-id="listing-page-title"], h1',
    price: '.currency-value, [data-test-id="price"]',
    originalPrice: '.was-price',
    rating: '.shop2-review-rating, .rating-star',
    reviewCount: '.shop2-review-count, .review-count',
    shop: '.shop-name, [data-test-id="shop-name"]',
    description: '[data-test-id="listing-page-description"], .listing-page-description',
    images: '.listing-page-image img, .image-carousel-image img'
  },
  
  shopify: {
    title: '.product-title, .product__title, h1.product-single__title, .product-form__title',
    price: '.price, .product-price, .product__price, .price__current',
    originalPrice: '.compare-price, .product__price--compare, .price__was',
    rating: '.stamped-review-header-starrating, .spr-starrating',
    reviewCount: '.stamped-review-header-title, .spr-summary-actions-togglereviews',
    shop: 'header .logo, .site-title, .header__heading',
    description: '.product-description, .product__description, .product-single__description',
    images: '.product-image img, .product__media img, .product-single__photos img'
  }
};

// Scrape product information
function scrapeProductInfo() {
  const platform = detectPlatform();
  if (platform === 'unknown') {
    console.log('Unknown platform, skipping scraping');
    return null;
  }
  
  const selectors = PLATFORM_SELECTORS[platform];
  const productInfo = {
    platform: platform,
    url: window.location.href
  };
  
  try {
    // Title
    const titleEl = document.querySelector(selectors.title);
    productInfo.title = titleEl ? titleEl.textContent.trim() : '';
    
    // Price
    const priceEl = document.querySelector(selectors.price);
    productInfo.price = priceEl ? priceEl.textContent.trim() : '';
    
    // Original price
    const originalPriceEl = document.querySelector(selectors.originalPrice);
    productInfo.originalPrice = originalPriceEl ? originalPriceEl.textContent.trim() : '';
    
    // Rating
    const ratingEl = document.querySelector(selectors.rating);
    productInfo.rating = ratingEl ? ratingEl.textContent.trim() : '';
    
    // Review count
    const reviewCountEl = document.querySelector(selectors.reviewCount);
    productInfo.reviewCount = reviewCountEl ? reviewCountEl.textContent.trim() : '';
    
    // Shop
    const shopEl = document.querySelector(selectors.shop);
    productInfo.shop = shopEl ? shopEl.textContent.trim() : '';
    
    // Description
    const descEl = document.querySelector(selectors.description);
    let description = '';
    if (descEl) {
      // Clean up description text
      description = descEl.textContent
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n+/g, ' ')  // Replace newlines with space
        .trim();
    }
    productInfo.description = description;
    
    // Extract keywords from title only
    productInfo.keywords = extractKeywords(productInfo.title);
    
    console.log('Scraped product info:', productInfo);
    return productInfo;
    
  } catch (error) {
    console.error('Error scraping product info:', error);
    return null;
  }
}

// Extract meaningful keyword phrases
function extractKeywords(text) {
  if (!text) return [];
  
  // Clean and normalize text
  const cleanText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const keywords = [];
  
  // 1. Extract brand/product patterns
  const brandPatterns = [
    /(\w+)\s+(shirt|tshirt|tee|hoodie|dress|pants|jeans|jacket|sweater|blouse)/g,
    /(\w+)\s+(bag|purse|wallet|backpack|handbag)/g,
    /(\w+)\s+(shoes|sneakers|boots|sandals|heels)/g,
    /(\w+)\s+(watch|jewelry|necklace|bracelet|ring)/g,
    /(\w+)\s+(phone|case|cover|accessory)/g
  ];
  
  brandPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      keywords.push(match[0]);
    }
  });
  
  // 2. Extract meaningful phrases (2-3 words)
  const words = cleanText.split(' ').filter(word => word.length > 2);
  
  // Skip common words for phrases
  const skipWords = ['the', 'and', 'for', 'with', 'from', 'made', 'high', 'quality', 'soft', 'comfortable'];
  
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];
    
    if (!skipWords.includes(word1) && !skipWords.includes(word2)) {
      const phrase = `${word1} ${word2}`;
      if (!keywords.includes(phrase)) {
        keywords.push(phrase);
      }
    }
  }
  
  // 3. Extract single important words
  const importantWords = words.filter(word => 
    !skipWords.includes(word) && 
    !word.match(/^\d+$/) && 
    !word.match(/^(xs|sm|md|lg|xl|xxl|xxxl)$/) &&
    word.length > 3
  );
  
  // Add unique important words
  importantWords.forEach(word => {
    if (!keywords.some(kw => kw.includes(word))) {
      keywords.push(word);
    }
  });
  
  // 4. Clean up and limit results
  return keywords
    .filter(kw => kw.length > 2)
    .slice(0, 6); // Limit to 6 meaningful keywords
}

// === LOCAL STORAGE SYSTEM ===

// IndexedDB setup
let db;
const DB_NAME = 'JEGProductsDB';
const DB_VERSION = 1;
const STORE_NAME = 'products';

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized successfully');
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      // Create products store
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      
      // Create indexes
      store.createIndex('platform', 'platform', { unique: false });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      store.createIndex('title', 'title', { unique: false });
      
      console.log('IndexedDB store created');
    };
  });
}

// Save product data to IndexedDB
function saveProductToDB(productData) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject('Database not initialized');
      return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.add(productData);
    
    request.onsuccess = () => {
      console.log('Product saved to DB:', request.result);
      resolve(request.result);
    };
    
    request.onerror = () => {
      console.error('Error saving product:', request.error);
      reject(request.error);
    };
  });
}

// Get all products from IndexedDB
function getAllProducts() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject('Database not initialized');
      return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Initialize DB when content script loads
initDB().catch(console.error);

// === SAVE PRODUCT HANDLER ===

// Main function to save product data
async function saveProductData(designImageBase64, mockupImageUrl, originalImageBase64) {
  try {
    // Get user name from storage
    const userName = await new Promise((resolve) => {
      chrome.storage.local.get(['userName'], function(result) {
        resolve(result.userName || 'Unknown');
      });
    });
    
    // Scrape product information from current page
    const productInfo = scrapeProductInfo();
    
    if (!productInfo) {
      alert('Cannot get product information from this page!\nPlease try on Amazon, Etsy or Shopify pages.');
      return;
    }
    
    // Convert mockup URL to base64 for storage
    const mockupImageBase64 = await urlToBase64(mockupImageUrl);
    
    // Smart compression: Design keeps high quality, Mockup heavily compressed
    console.log('Original image sizes:', {
      designImage: Math.round(designImageBase64.length / 1024) + 'KB',
      mockupImage: Math.round(mockupImageBase64.length / 1024) + 'KB'
    });
    
    // Design: Keep PNG transparent, high quality for printing but reduce size
    const optimizedDesignImage = await smartCompressDesign(designImageBase64);
    
    // Mockup: JPEG heavily compressed to ensure under 8MB
    const compressedMockupImage = await compressImage(mockupImageBase64, 0.3, 800, 'jpeg');
    
    console.log('Optimized image sizes:', {
      designImage: Math.round(optimizedDesignImage.length / 1024) + 'KB',
      mockupImage: Math.round(compressedMockupImage.length / 1024) + 'KB'
    });
    
    // Check total size and compress more if needed
    let finalDesignImage = optimizedDesignImage;
    let finalMockupImage = compressedMockupImage;
    
    const tempData = {
      id: generateUniqueId(),
      productName: productInfo.title, // API expects camelCase → product_name
      platform: productInfo.platform,
      userName: userName, // API expects camelCase → user_name
      keywords: Array.isArray(productInfo.keywords) ? productInfo.keywords : (productInfo.keywords ? productInfo.keywords.split(',').map(k => k.trim()) : []), // JSON array for database
      description: productInfo.description,
      originalUrl: productInfo.url, // API expects camelCase → original_url (database schema updated)
      designImage: finalDesignImage, // API expects camelCase → design_image
      mockupImage: finalMockupImage, // API expects camelCase → mockup_image
      // Remove extensionId as database schema doesn't have extension_id column
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    
    const totalSizeKB = Math.round(JSON.stringify(tempData).length / 1024);
    console.log('Total data size:', totalSizeKB + 'KB');
    
    // If exceeds 8MB (8192KB), compress more
    if (totalSizeKB > 8000) { // For safety, check 8000KB instead of 8192KB
      console.log('Data too large, applying extra compression...');
      
      // Compress design smaller
      finalDesignImage = await smartCompressDesign(designImageBase64, 2000); // Reduce to 2000px
      
      // Compress mockup extremely
      finalMockupImage = await compressImage(mockupImageBase64, 0.2, 600, 'jpeg');
      
      console.log('Extra compressed sizes:', {
        designImage: Math.round(finalDesignImage.length / 1024) + 'KB',
        mockupImage: Math.round(finalMockupImage.length / 1024) + 'KB'
      });
    }
    
    // Format date time according to ISO format for API
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19); // Format: 2025-01-15 14:30:00

    // Create product data object according to API format with optimized compressed images
    const productData = {
      id: generateUniqueId(),
      productName: productInfo.title, // API expects camelCase → product_name
      platform: productInfo.platform,
      userName: userName, // API expects camelCase → user_name
      keywords: Array.isArray(productInfo.keywords) ? productInfo.keywords : (productInfo.keywords ? productInfo.keywords.split(',').map(k => k.trim()) : []), // JSON array for database
      description: productInfo.description,
      originalUrl: productInfo.url, // API expects camelCase → original_url (database schema updated)
      designImage: finalDesignImage, // API expects camelCase → design_image
      mockupImage: finalMockupImage, // API expects camelCase → mockup_image
      // Remove extensionId as database schema doesn't have extension_id column
      timestamp: timestamp
    };
    
    // Log final size
    const finalSizeKB = Math.round(JSON.stringify(productData).length / 1024);
    console.log('Final data size before sending:', finalSizeKB + 'KB');
    
    // Send data to website API
    try {
      await sendProductToAPI(productData);
      
      // Show success notification
      showSuccessNotification('Successfully saved to JEG Website');
      
      // Increment usage count when product is successfully saved to JEG Website
      incrementUsageCount();
      
      console.log('Product saved successfully to website:', productData);
      
    } catch (apiError) {
      // If API error, still backup locally
      console.warn('API failed, saving to local backup:', apiError);
      
      const backupData = {
        ...productData,
        apiError: apiError.message,
        backupReason: 'API connection failed'
      };
      
      await saveProductToDB(backupData);
      downloadJSON(backupData, `product-backup-${backupData.id}.json`);
      
      showErrorNotification(`⚠️ Cannot send to website: ${apiError.message}\nBackup saved to computer.`, 6000);
      return; // Exit function, don't run code below
    }
    
    // Backup: Save to IndexedDB (after API success)
    await saveProductToDB(productData);
    
  } catch (error) {
    console.error('Error saving product:', error);
    
    // If API error, still backup locally and notify
    try {
      // Get userName again if not available
      let userName = 'Unknown';
      try {
        const userResult = await new Promise((resolve) => {
          chrome.storage.local.get(['userName'], function(result) {
            resolve(result.userName || 'Unknown');
          });
        });
        userName = userResult;
      } catch (userError) {
        console.warn('Cannot get userName:', userError);
      }

      // Get productInfo again if not available
      let productInfo = null;
      try {
        productInfo = scrapeProductInfo();
      } catch (scrapeError) {
        console.warn('Cannot scrape productInfo:', scrapeError);
      }

      const backupData = {
        id: generateUniqueId(),
        productName: productInfo?.title || 'Unknown',
        platform: productInfo?.platform || 'unknown',
        userName: userName,
        originalUrl: productInfo?.url || window.location.href, // Database has 'original_url' column
        keywords: Array.isArray(productInfo?.keywords) ? productInfo.keywords : (productInfo?.keywords ? productInfo.keywords.split(',').map(k => k.trim()) : []),
        designImage: designImageBase64,
        mockupImage: mockupImageBase64,
        // Remove extensionId as database schema doesn't have this column
        timestamp: new Date().toISOString()
      };
      await saveProductToDB(backupData);
      downloadJSON(backupData, `product-backup-${backupData.id}.json`);
      
             showErrorNotification('⚠️ Cannot connect to website! Backup saved to computer and browser.', 5000);
    } catch (backupError) {
      alert('Error saving product: ' + error.message);
    }
  }
}

// Function to send data to website API via background script
async function sendProductToAPI(productData) {
  return new Promise((resolve, reject) => {
    console.log('Content script sending product data via background script:', {
      id: productData.id,
      productName: productData.productName,
      platform: productData.platform,
      userName: productData.userName,
      originalUrl: productData.originalUrl,
      keywords: productData.keywords,
      hasDesignImage: !!productData.designImage,
      hasMockupImage: !!productData.mockupImage,
      timestamp: productData.timestamp
    });
    
    // Debug: Check if originalUrl has value
    console.log('🔍 DEBUG originalUrl:', productData.originalUrl);
    console.log('🔍 DEBUG window.location.href:', window.location.href);
    
    // Send message to background script to handle API call
    chrome.runtime.sendMessage({
      action: 'sendProductToAPI',
      productData: productData
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error('Error communicating with background script: ' + chrome.runtime.lastError.message));
        return;
      }
      
      if (response.success) {
        console.log('Product data sent successfully via background script:', response.data);
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Unknown error from background script'));
      }
    });
  });
}

// Convert URL to base64
function urlToBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataURL);
    };
    
    img.onerror = function() {
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

// Generate unique ID
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Smart compress design image - maintain high quality for printing
function smartCompressDesign(base64String, maxDimension = 3000) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Only reduce size if too large, maintain aspect ratio
      let { width, height } = img;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw image with transparent background
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Export PNG with high quality, maintain transparent background
      const optimizedBase64 = canvas.toDataURL('image/png');
      resolve(optimizedBase64);
    };
    img.src = base64String;
  });
}

// Compress mockup image - can compress heavily as it's only for display
function compressImage(base64String, quality = 0.7, maxWidth = 1920, format = 'jpeg') {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new size
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // If JPEG, fill white background first
      if (format === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Export image with corresponding format and quality
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const compressedBase64 = canvas.toDataURL(mimeType, quality);
      resolve(compressedBase64);
    };
    img.src = base64String;
  });
}

// Show success notification
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.background = '#4caf50';
  notification.style.color = 'white';
  notification.style.padding = '12px 24px';
  notification.style.borderRadius = '6px';
  notification.style.zIndex = '9999999';
  notification.style.fontSize = '14px';
  notification.style.fontWeight = 'bold';
  notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  notification.style.maxWidth = '350px';
  notification.style.wordWrap = 'break-word';
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Show error notification
function showErrorNotification(message, duration = 5000) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.background = '#f44336';
  notification.style.color = 'white';
  notification.style.padding = '12px 24px';
  notification.style.borderRadius = '6px';
  notification.style.zIndex = '9999999';
  notification.style.fontSize = '14px';
  notification.style.fontWeight = 'bold';
  notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  notification.style.maxWidth = '350px';
  notification.style.wordWrap = 'break-word';
  notification.style.border = '2px solid #d32f2f';
  
  document.body.appendChild(notification);
  
  // Auto remove after specified duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, duration);
}

// === UTILITY FUNCTIONS ===

// Download JSON data as file
function downloadJSON(data, filename) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

// Function to upload image to ImgBB
async function uploadImageToImgBB(imageBase64, apiKey) {
  const formData = new FormData();
  // Remove header 'data:image/png;base64,' if present
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  formData.append('image', base64Data);
  
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData
  });
  
  const data = await res.json();
  if (data.success) {
    return data.data.url; // Public image link
  } else {
    throw new Error('Image upload failed: ' + (data.error ? data.error.message : 'Unknown error'));
  }
}

// Function to render mockup with DynamicMockups API
async function renderMockup(mockupUuid, smartObjectUuid, imageUrl, apiKey, smartObjectInfo) {
  const body = {
    mockup_uuid: mockupUuid,
    export_label: 'MOCKUP_' + Date.now(),
    export_options: {
      image_format: 'jpg',
      image_size: 1500,
      mode: 'download'
    },
    smart_objects: [
      {
        uuid: smartObjectUuid,
        asset: {
          url: imageUrl,
          fit: 'contain' // Only use fit for automatic alignment, remove position and size
          // Remove size and position to avoid conflict with fit
        },
        // Use print area preset if available
        print_area_preset_uuid: smartObjectInfo && smartObjectInfo.print_area_presets && smartObjectInfo.print_area_presets[0] ? smartObjectInfo.print_area_presets[0].uuid : undefined
      }
    ]
  };
  
  const res = await fetch('https://app.dynamicmockups.com/api/v1/renders', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  if (data.success && data.data && data.data.export_path) {
    return data.data.export_path;
  } else {
    throw new Error(data.message || 'Cannot create mockup');
  }
}

// Function to get mockup list from backend
async function fetchMockupTemplates() {
  const res = await fetch('https://jeg-redesign.onrender.com/mockup-templates', {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Could not get mockup list');
  return await res.json();
}

// Function to create composite mockup from custom mockup and design
function createCustomMockupComposite(mockupBase64, designBase64) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const mockupImg = new Image();
    const designImg = new Image();
    
    let imagesLoaded = 0;
    const totalImages = 2;
    
    function checkImagesLoaded() {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        try {
          // Set canvas size according to mockup
          canvas.width = mockupImg.width;
          canvas.height = mockupImg.height;
          
          // Draw mockup as background
          ctx.drawImage(mockupImg, 0, 0);
          
          // Calculate position and size for design
          // Place design at center with appropriate size
          const maxDesignWidth = canvas.width * 0.3;  // 30% of mockup width
          const maxDesignHeight = canvas.height * 0.3; // 30% of mockup height
          
          let designWidth = designImg.width;
          let designHeight = designImg.height;
          
          // Scale design to fit within max size
          const scaleX = maxDesignWidth / designWidth;
          const scaleY = maxDesignHeight / designHeight;
          const scale = Math.min(scaleX, scaleY);
          
          designWidth *= scale;
          designHeight *= scale;
          
          // Center position
          const x = (canvas.width - designWidth) / 2;
          const y = (canvas.height - designHeight) / 2;
          
          // Add shadow for design
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          // Draw design on mockup
          ctx.drawImage(designImg, x, y, designWidth, designHeight);
          
          ctx.restore();
          
          // Convert to base64
          const result = canvas.toDataURL('image/jpeg', 0.9);
          resolve(result);
          
        } catch (error) {
          reject(new Error('Error compositing image: ' + error.message));
        }
      }
    }
    
    function handleImageError(errorMsg) {
      reject(new Error(errorMsg));
    }
    
    // Load mockup image
    mockupImg.onload = checkImagesLoaded;
    mockupImg.onerror = () => handleImageError('Cannot load mockup image');
    mockupImg.src = mockupBase64;
    
    // Load design image
    designImg.onload = checkImagesLoaded;
    designImg.onerror = () => handleImageError('Cannot load design image');
    designImg.src = designBase64;
  });
}

// Function to create custom mockup with user interaction (advanced option)
function createInteractiveCustomMockup(mockupBase64, designBase64) {
  return new Promise((resolve, reject) => {
    // Create popup for user to adjust design position and size
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.zIndex = '1000003';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    const popup = document.createElement('div');
    popup.style.background = '#fff';
    popup.style.borderRadius = '10px';
    popup.style.padding = '20px';
    popup.style.maxWidth = '90vw';
    popup.style.maxHeight = '90vh';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.alignItems = 'center';
    
    const title = document.createElement('div');
    title.textContent = 'Adjust design position on mockup';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '18px';
    title.style.marginBottom = '20px';
    popup.appendChild(title);
    
    const canvas = document.createElement('canvas');
    canvas.style.border = '2px solid #ddd';
    canvas.style.maxWidth = '600px';
    canvas.style.maxHeight = '600px';
    canvas.style.cursor = 'move';
    popup.appendChild(canvas);
    
    const controls = document.createElement('div');
    controls.style.marginTop = '20px';
    controls.style.display = 'flex';
    controls.style.gap = '10px';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Confirm';
    confirmBtn.style.padding = '10px 20px';
    confirmBtn.style.background = '#4CAF50';
    confirmBtn.style.color = 'white';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '5px';
    confirmBtn.style.cursor = 'pointer';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.padding = '10px 20px';
    cancelBtn.style.background = '#f44336';
    cancelBtn.style.color = 'white';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '5px';
    cancelBtn.style.cursor = 'pointer';
    
    controls.appendChild(confirmBtn);
    controls.appendChild(cancelBtn);
    popup.appendChild(controls);
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // TODO: Implement interactive positioning logic
    // For now, just use the simple composite
    confirmBtn.onclick = () => {
      overlay.remove();
      createCustomMockupComposite(mockupBase64, designBase64)
        .then(resolve)
        .catch(reject);
    };
    
    cancelBtn.onclick = () => {
      overlay.remove();
      reject(new Error('User cancelled'));
    };
  });
}





 