chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture') {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      sendResponse({dataUrl});
    });
    // Bắt buộc return true để dùng sendResponse bất đồng bộ
    return true;
  }
  if (message.action === 'download' && message.url) {
    chrome.downloads.download({
      url: message.url,
      filename: 'screenshot.png',
      saveAs: true
    });
  }
}); 