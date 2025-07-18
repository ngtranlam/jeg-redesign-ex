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
  
  // Xử lý gửi dữ liệu sản phẩm lên API
  if (message.action === 'sendProductToAPI') {
    sendProductToAPI(message.productData)
      .then(result => {
        sendResponse({success: true, data: result});
      })
      .catch(error => {
        sendResponse({success: false, error: error.message});
      });
    return true; // Bắt buộc return true để dùng sendResponse bất đồng bộ
  }
});

// Hàm gửi dữ liệu lên API của trang web (chạy trong background)
async function sendProductToAPI(productData) {
  const API_URL = 'https://jegdn.com/api/redesign/receive/';
  
  // Validate dữ liệu trước khi gửi
  if (!productData.id || !productData.productName || !productData.platform || !productData.userName || !productData.originalUrl) {
    throw new Error('Thiếu thông tin bắt buộc: id, productName, platform, userName hoặc originalUrl');
  }
  
  console.log('=== BACKGROUND SCRIPT DEBUG ===');
  console.log('API URL:', API_URL);
  console.log('Product data summary:', {
    id: productData.id,
    productName: productData.productName,
    platform: productData.platform,
    userName: productData.userName,
    originalUrl: productData.originalUrl,
    keywords: productData.keywords,
    hasDesignImage: !!productData.designImage,
    hasMockupImage: !!productData.mockupImage,
    timestamp: productData.timestamp,
    designImageSize: productData.designImage ? productData.designImage.length : 0,
    mockupImageSize: productData.mockupImage ? productData.mockupImage.length : 0
  });
  
  // Bỏ test connection vì server chỉ hỗ trợ POST method
  console.log('Sending directly to API endpoint (no ping test)...');
  
  try {
    console.log('Sending POST request to API...');
    console.log('Final API URL:', API_URL);
    console.log('Request method: POST');
    console.log('Request headers will be:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'JEG-Extension/1.0',
      'X-Requested-With': 'JEG-Extension',
      'Cache-Control': 'no-cache'
    });
    
    // Tạo timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 giây timeout
    
    const response = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'error', // Không cho phép redirect để tránh POST->GET
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'JEG-Extension/1.0',
        'X-Requested-With': 'JEG-Extension',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(productData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Hủy timeout nếu request thành công
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API Error: ${response.status} - ${response.statusText}. Details: ${errorText}`);
    }
    
    // Kiểm tra response content type
    const contentType = response.headers.get('content-type');
    console.log('Response content-type:', contentType);
    
    // Lấy response text trước để kiểm tra
    const responseText = await response.text();
    console.log('Raw response text:', responseText.substring(0, 200) + '...');
    
    // Kiểm tra xem có phải JSON không
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Server không trả về JSON:', responseText);
      throw new Error(`Server trả về ${contentType || 'unknown'} thay vì JSON. Response: ${responseText.substring(0, 100)}...`);
    }
    
    // Parse JSON
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('API Success Response:', result);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response text:', responseText);
      throw new Error(`Server trả về dữ liệu không phải JSON hợp lệ. Response: ${responseText.substring(0, 100)}...`);
    }
    
    return result;
    
  } catch (error) {
    console.error('Background API Request failed:', error);
    
    // Kiểm tra loại lỗi để đưa ra thông báo phù hợp
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: Server mất quá nhiều thời gian phản hồi (>30 giây).');
    } else if (error.name === 'TypeError' && error.message.includes('redirected')) {
      // Nếu bị redirect, thử lại với allow redirect
      console.log('Detected redirect, retrying with follow mode...');
      try {
        const retryResponse = await fetch(API_URL, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow', // Cho phép redirect
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'JEG-Extension/1.0',
            'X-Requested-With': 'JEG-Extension',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify(productData)
        });
        
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(`API Error: ${retryResponse.status} - ${retryResponse.statusText}. Details: ${errorText}`);
        }
        
        const responseText = await retryResponse.text();
        return JSON.parse(responseText);
        
      } catch (retryError) {
        throw new Error(`Lỗi sau khi retry: ${retryError.message}`);
      }
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Không thể kết nối tới server (${new URL(API_URL).host}). Vui lòng kiểm tra server có đang chạy không.`);
    } else if (error.message.includes('CORS')) {
      throw new Error('Lỗi CORS: Server chưa cho phép truy cập từ extension.');
    } else {
      throw new Error(`Lỗi gửi dữ liệu: ${error.message}`);
    }
  }
} 