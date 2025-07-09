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
  if (message.action === 'create_mockup') {
    createMockup(message, sendResponse);
    return true; // Bắt buộc return true để dùng sendResponse bất đồng bộ
  }
});

async function createMockup(message, sendResponse) {
  try {
    // Chuyển base64 image thành blob
    const response = await fetch(message.imageUrl);
    const blob = await response.blob();
    
    // Lấy danh sách mockups phù hợp theo filter
    const mockupParams = new URLSearchParams();
    if (message.gender) mockupParams.append('gender', message.gender);
    if (message.product) mockupParams.append('product', message.product);
    if (message.view) mockupParams.append('view', message.view);
    if (message.color) mockupParams.append('color', message.color);
    
    const mockupsResponse = await fetch(`https://jeg-redesign.onrender.com/dynamic-mockups/mockups?${mockupParams.toString()}`);
    const mockupsData = await mockupsResponse.json();
    
    if (!mockupsData.success || mockupsData.mockups.length === 0) {
      sendResponse({error: 'Không tìm thấy mockup phù hợp với filter đã chọn'});
      return;
    }
    
    // Chọn mockup đầu tiên phù hợp
    const selectedMockup = mockupsData.mockups[0];
    const mockupUuid = selectedMockup.uuid;
    
    // Lấy smart object đầu tiên của mockup
    const smartObjects = selectedMockup.smart_objects || [];
    if (smartObjects.length === 0) {
      sendResponse({error: 'Mockup không có smart objects'});
      return;
    }
    
    const smartObjectUuid = smartObjects[0].uuid;
    
    // Tạo FormData để gửi lên backend
    const formData = new FormData();
    formData.append('design_image', blob, 'design.png');
    formData.append('mockup_uuid', mockupUuid);
    formData.append('smart_object_uuid', smartObjectUuid);
    
    // Gọi API backend để tạo mockup
    const apiResponse = await fetch('https://jeg-redesign.onrender.com/dynamic-mockups/create-mockup', {
      method: 'POST',
      body: formData
    });
    
    const data = await apiResponse.json();
    
    if (data.success && data.mockup_url) {
      sendResponse({mockupUrl: data.mockup_url});
    } else {
      sendResponse({error: data.error || 'Tạo mockup thất bại'});
    }
  } catch (error) {
    console.error('Error creating mockup:', error);
    sendResponse({error: 'Lỗi kết nối khi tạo mockup: ' + error.message});
  }
} 