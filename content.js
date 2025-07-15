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
  btn.title = 'Chụp vùng màn hình';

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

  btn.addEventListener('click', startSelection);
  document.body.appendChild(btn);
})();

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

  // Thanh chọn Provider, Model về sát mép trên bên trái, RUN sát phải
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
  // Hàm cập nhật model theo provider
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

  // PROMPT input (2 ô, nằm ngang)
  const promptWrap = document.createElement('div');
  promptWrap.style.display = 'none'; // Ẩn mặc định
  promptWrap.style.flexDirection = 'row';
  promptWrap.style.gap = '24px';
  promptWrap.style.marginTop = '8px';
  promptWrap.style.width = '100%';
  promptWrap.style.alignItems = 'flex-end';

  // Col 1: Đối tượng cần thay thế
  const promptCol1 = document.createElement('div');
  promptCol1.style.display = 'flex';
  promptCol1.style.flexDirection = 'column';
  promptCol1.style.gap = '4px';
  promptCol1.style.flex = '1';
  const objectLabel = document.createElement('label');
  objectLabel.textContent = 'Đối tượng cần thay thế:';
  objectLabel.style.fontWeight = 'bold';
  objectLabel.style.fontSize = '14px';
  objectLabel.style.textAlign = 'left';
  objectLabel.style.width = '100%';
  const objectInput = document.createElement('input');
  objectInput.type = 'text';
  objectInput.placeholder = 'Ví dụ: text trên áo, logo, màu nền...';
  objectInput.style.padding = '6px 12px';
  objectInput.style.fontSize = '15px';
  objectInput.style.borderRadius = '6px';
  objectInput.style.border = '1px solid #888';
  objectInput.style.width = '100%';
  promptCol1.appendChild(objectLabel);
  promptCol1.appendChild(objectInput);

  // Col 2: Nội dung thay thế
  const promptCol2 = document.createElement('div');
  promptCol2.style.display = 'flex';
  promptCol2.style.flexDirection = 'column';
  promptCol2.style.gap = '4px';
  promptCol2.style.flex = '1';
  const contentLabel = document.createElement('label');
  contentLabel.textContent = 'Nội dung thay thế:';
  contentLabel.style.fontWeight = 'bold';
  contentLabel.style.fontSize = '14px';
  contentLabel.style.textAlign = 'left';
  contentLabel.style.width = '100%';
  const contentInput = document.createElement('input');
  contentInput.type = 'text';
  contentInput.placeholder = 'Ví dụ: text mới, logo mới, màu mới...';
  contentInput.style.padding = '6px 12px';
  contentInput.style.fontSize = '15px';
  contentInput.style.borderRadius = '6px';
  contentInput.style.border = '1px solid #888';
  contentInput.style.width = '100%';
  promptCol2.appendChild(contentLabel);
  promptCol2.appendChild(contentInput);

  // Thêm 2 col vào promptWrap
  promptWrap.appendChild(promptCol1);
  promptWrap.appendChild(promptCol2);

  // Hiện/ẩn prompt khi chọn mode
  modeSelect.addEventListener('change', function() {
    if (modeSelect.value === 'custom') {
      promptWrap.style.display = 'flex';
    } else {
      promptWrap.style.display = 'none';
    }
  });

  // Tạo 2 hàng cho input
  // Hàng 1: Provider, Model, Mode
  const row1 = document.createElement('div');
  row1.style.display = 'flex';
  row1.style.gap = '24px';
  row1.style.alignItems = 'flex-end';
  row1.appendChild(providerWrap);
  row1.appendChild(modelWrap);
  row1.appendChild(modeWrap);

  // Hàng 2: Đối tượng cần thay thế, Nội dung thay thế
  const row2 = document.createElement('div');
  row2.style.display = 'flex';
  row2.style.gap = '24px';
  row2.style.alignItems = 'flex-end';
  row2.appendChild(promptWrap);

  // Xoá các appendChild cũ của leftTopGroup
  leftTopGroup.appendChild(row1);
  leftTopGroup.appendChild(row2);
  topBar.appendChild(leftTopGroup);

  // Nút RUN, Cancel, Download thẳng hàng, đều nhau
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

  // Container căn giữa 2 khung ảnh cả chiều ngang và dọc, dịch lên trên
  const centerContainer = document.createElement('div');
  centerContainer.style.flex = '1';
  centerContainer.style.display = 'flex';
  centerContainer.style.justifyContent = 'center';
  centerContainer.style.alignItems = 'flex-start';
  centerContainer.style.width = '100%';
  centerContainer.style.height = '100%';
  centerContainer.style.marginTop = '10px'; // dịch lên trên
  centerContainer.style.marginBottom = '60px'; // tăng khoảng cách với bottom bar

  // 2 cột: Hình gốc - Kết quả
  const mainContent = document.createElement('div');
  mainContent.style.display = 'flex';
  mainContent.style.flexDirection = 'row';
  mainContent.style.justifyContent = 'center';
  mainContent.style.alignItems = 'center';
  mainContent.style.gap = '60px';
  mainContent.style.width = 'auto';
  mainContent.style.height = 'auto';

  // Cột trái: Hình gốc
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
    leftCol.textContent = 'LỖI';
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

  // Cột phải: Kết quả
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
    rightCol.textContent = 'LỖI';
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

  // Thay bottomBar bằng bảng chọn màu, title bên trái các ô màu
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

  // 7 màu cơ bản
  const colors = ['#ffffff', '#000000', '#888888', '#ff9800', '#2196f3', '#4caf50', '#e91e63', '#f44336'];
  colors.forEach(color => {
    const colorBtn = document.createElement('button');
    colorBtn.style.width = '16px';
    colorBtn.style.height = '24px';
    colorBtn.style.borderRadius = '0'; // hình chữ nhật đứng
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

  // Xử lý nút RUN
  runBtn.onclick = async function() {
    runBtn.disabled = true;
    runBtn.textContent = 'Processing...';
    downloadBtn.disabled = true;
    if (resultImg) {
      resultImg.style.display = 'none';
    }
    // Gửi ảnh lên API backend
    try {
      const blob = dataURLtoBlob(dataUrl);
      const formData = new FormData();
      formData.append('file', blob, 'capture.png');
      // API key sẽ được xử lý ở backend, không cần gửi từ frontend
      let modelToSend = modelSelect.value;
      if (providerSelect.value === 'gemini') {
        modelToSend = 'gpt-4.1';
      }
      formData.append('model', modelToSend);
      formData.append('size', '4500');
      let customPrompt = '';
      if (modeSelect.value === 'custom') {
        customPrompt = `Thay thế ${objectInput.value || '[đối tượng]'} bằng ${contentInput.value || '[nội dung mới]'}.`;
      }
      formData.append('prompt', customPrompt);
      formData.append('mode', modeSelect.value); // gửi mode lên API
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
        alert(data.error || 'Lỗi không xác định!');
      }
    } catch (err) {
      alert('Lỗi kết nối API: ' + err);
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

  // Thêm nút Tạo Mockup
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

  // Biến lưu ảnh kết quả base64
  let lastResultImgBase64 = null;

  // Xử lý nút Tạo Mockup
  mockupBtn.onclick = function() {
    // Ẩn popup cũ, show popup mockup
    bg.style.display = 'none';
    showMockupPopup(lastResultImgBase64);
  };

  // Hàm show popup mockup
  function showMockupPopup(designBase64) {
    // Xoá popup mockup cũ nếu có
    const oldMockup = document.getElementById('jeg-mockup-popup-bg');
    if (oldMockup) oldMockup.remove();
    // Tạo popup mới
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

    // Thanh thiết lập mockup ở trên
    const topBar = document.createElement('div');
    topBar.style.display = 'flex';
    topBar.style.justifyContent = 'space-between';
    topBar.style.alignItems = 'center';
    topBar.style.height = '80px';
    topBar.style.padding = '16px 16px 0 16px';
    topBar.style.boxSizing = 'border-box';
    topBar.style.width = '100%';

    // Bên trái: Tiêu đề và chọn template
    const leftTopGroup = document.createElement('div');
    leftTopGroup.style.display = 'flex';
    leftTopGroup.style.gap = '24px';
    leftTopGroup.style.alignItems = 'center';

    // Tiêu đề
    // const title = document.createElement('div');
    // title.textContent = 'TẠO MOCKUP ÁO THUN';
    // title.style.fontWeight = 'bold';
    // title.style.fontSize = '22px';
    // title.style.letterSpacing = '2px';
    // leftTopGroup.appendChild(title);

    // --- Thay dropdown chọn template bằng nút chọn mockup ---
    let selectedMockup = null;
    let selectedSmartObject = null; // Thêm biến lưu smart object
    const selectMockupBtn = document.createElement('button');
    selectMockupBtn.textContent = 'Chọn mẫu mockup';
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

    // Hàm hiện popup chọn mockup
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
      popup.style.minWidth = '600px';
      popup.style.maxWidth = '90vw';
      popup.style.maxHeight = '80vh';
      popup.style.overflowY = 'auto';
      popup.style.boxShadow = '0 4px 32px rgba(0,0,0,0.18)';
      const title = document.createElement('div');
      title.textContent = 'Chọn mẫu mockup';
      title.style.fontWeight = 'bold';
      title.style.fontSize = '22px';
      title.style.marginBottom = '24px';
      popup.appendChild(title);
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
              
              // Lấy smart object đầu tiên (hoặc cho chọn nếu có nhiều)
              if (m.smart_objects && m.smart_objects.length > 0) {
                selectedSmartObject = m.smart_objects[0]; // Lấy cái đầu tiên
                selectMockupBtn.textContent = 'Đã chọn mẫu';
                console.log('Selected mockup:', m);
                console.log('Selected smart object:', selectedSmartObject);
                
                // Hiển thị mẫu mockup đã chọn trong khung kết quả
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
                alert('Mockup này không có vị trí để gắn thiết kế!');
                return;
              }
              
              overlay.remove();
            };
            list.appendChild(item);
          });
        })
        .catch(err => {
          console.error('Lỗi lấy mockup:', err);
          list.textContent = 'Không lấy được danh sách mockup: ' + err.message;
        });
      popup.appendChild(list);
      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Đóng';
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

    // Bên phải: Nút tạo và quay lại
    const rightTopGroup = document.createElement('div');
    rightTopGroup.style.display = 'flex';
    rightTopGroup.style.gap = '18px';
    rightTopGroup.style.alignItems = 'center';

    // Nút tạo mockup
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

    // Nút quay lại
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

    // Container chính: 2 cột song song
    const mainContainer = document.createElement('div');
    mainContainer.style.flex = '1';
    mainContainer.style.display = 'flex';
    mainContainer.style.justifyContent = 'center';
    mainContainer.style.alignItems = 'flex-start';
    mainContainer.style.width = '100%';
    mainContainer.style.height = '100%';
    mainContainer.style.marginTop = '10px';
    mainContainer.style.marginBottom = '60px';

    // 2 cột: Thiết kế gốc - Kết quả mockup
    const mainContent = document.createElement('div');
    mainContent.style.display = 'flex';
    mainContent.style.flexDirection = 'row';
    mainContent.style.justifyContent = 'center';
    mainContent.style.alignItems = 'center';
    mainContent.style.gap = '60px';
    mainContent.style.width = 'auto';
    mainContent.style.height = 'auto';

    // Cột trái: Thiết kế đã trích xuất
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
      leftCol.textContent = 'Nah';
    }
    leftColWrap.appendChild(leftCol);

    // Cột phải: Kết quả mockup
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

    // Nút tải về mockup (ẩn ban đầu)
    const downloadMockupBtn = document.createElement('button');
    downloadMockupBtn.textContent = 'TẢI MOCKUP VỀ';
    downloadMockupBtn.style.height = '48px';
    downloadMockupBtn.style.padding = '0 28px';
    downloadMockupBtn.style.borderRadius = '8px';
    downloadMockupBtn.style.fontWeight = 'bold';
    downloadMockupBtn.style.fontSize = '18px';
    downloadMockupBtn.style.border = '2.5px solid #2196f3';
    downloadMockupBtn.style.background = '#2196f3';
    downloadMockupBtn.style.color = '#fff';
    downloadMockupBtn.style.cursor = 'pointer';
    downloadMockupBtn.style.margin = '0';
    downloadMockupBtn.style.display = 'none';
    rightTopGroup.appendChild(downloadMockupBtn);

    // Xử lý nút Quay lại
    backBtn.onclick = function() {
      mockupBg.remove();
      bg.style.display = 'flex';
    };

    // Xử lý nút Tạo Mockup (tạm thời chỉ hiện nút tải về)
    createBtn.onclick = function() {
      if (!selectedMockup || !selectedSmartObject) {
        alert('Vui lòng chọn mẫu mockup trước!');
        return;
      }
      
      if (!designBase64) {
        alert('Không có thiết kế để tạo mockup!');
        return;
      }
      
      createBtn.disabled = true;
      createBtn.textContent = 'Đang tạo mockup...';
      
      // Hiển thị loading trên mẫu mockup
      const mockupPreview = document.getElementById('mockup-preview');
      if (mockupPreview) {
        mockupPreview.style.opacity = '0.3'; // Làm mờ
        
        // Tạo loading overlay
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
        
        // Thêm CSS animation cho spinner
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
      
      // Kiểm tra designBase64 trước khi gọi backend
      if (!designBase64) {
        alert('Không có ảnh design để tạo mockup!');
        createBtn.disabled = false;
        createBtn.textContent = 'CREATE MOCKUP';
        return;
      }
      
      console.log('Design base64 sample:', designBase64.substring(0, 100) + '...');
      
      // Gọi backend để tạo mockup
      createMockupViaBackend(selectedMockup.uuid, selectedSmartObject.uuid, designBase64, selectedSmartObject)
        .then(mockupUrl => {
          console.log('Mockup đã tạo thành công:', mockupUrl);
          
          // Xóa loading overlay
          const loadingOverlay = document.getElementById('loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.remove();
          }
          
          // Hiển thị mockup kết quả thật
          const mockupImg = document.createElement('img');
          mockupImg.src = mockupUrl;
          mockupImg.style.maxWidth = '100%';
          mockupImg.style.maxHeight = '100%';
          mockupImg.style.objectFit = 'contain';
          mockupImg.style.opacity = '1';
          
          rightCol.innerHTML = ''; // Xóa nội dung cũ
          rightCol.appendChild(mockupImg);
          
          downloadMockupBtn.style.display = 'block';
          downloadMockupBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = mockupUrl;
            a.download = 'mockup.jpg';
            a.click();
          };
          
          createBtn.disabled = false;
          createBtn.textContent = 'Create mockup';
        })
        .catch(err => {
          alert('Lỗi: ' + err.message);
          
          // Xóa loading overlay và khôi phục opacity
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
    };

    document.body.appendChild(mockupBg);
    mockupBg.appendChild(popup);
    // Không cần gọi API ở đây nữa vì sẽ gọi khi user nhấn nút chọn mockup
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

// Hàm lấy danh sách mockup từ backend
async function fetchMockupTemplates() {
  const res = await fetch('https://jeg-redesign.onrender.com/mockup-templates', {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Không lấy được danh sách mockup');
  return await res.json();
}

// Hàm tạo mockup qua backend
async function createMockupViaBackend(mockupUuid, smartObjectUuid, designBase64, smartObjectInfo) {
  try {
    console.log('Creating mockup with params:', {
      mockupUuid,
      smartObjectUuid,
      designImageLength: designBase64 ? designBase64.length : 0,
      smartObjectInfo
    });
    
    // Gửi dữ liệu dưới dạng FormData
    const formData = new FormData();
    formData.append('design_image', designBase64);
    formData.append('mockup_uuid', mockupUuid);
    formData.append('smart_object_uuid', smartObjectUuid);
    formData.append('smart_object_info', JSON.stringify(smartObjectInfo || {}));
    
    const res = await fetch('https://jeg-redesign.onrender.com/create-mockup', {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    console.log('Response data:', data);
    
    if (data.success) {
      return data.mockup_url;
    } else {
      throw new Error(data.error || 'Không tạo được mockup');
    }
  } catch (error) {
    console.error('Error in createMockupViaBackend:', error);
    throw error;
  }
} 