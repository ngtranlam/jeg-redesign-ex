chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture') {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      sendResponse({dataUrl});
    });
    // Required to return true for asynchronous sendResponse
    return true;
  }
  
  if (message.action === 'download' && message.url) {
    chrome.downloads.download({
      url: message.url,
      filename: 'screenshot.png',
      saveAs: true
    });
  }
  
  // Handle sending product data to API
  if (message.action === 'sendProductToAPI') {
    sendProductToAPI(message.productData)
      .then(result => {
        sendResponse({success: true, data: result});
      })
      .catch(error => {
        sendResponse({success: false, error: error.message});
      });
    return true; // Required to return true for asynchronous sendResponse
  }
});

// Function to send data to website API (running in background)
async function sendProductToAPI(productData) {
  const API_URL = 'https://jegdn.com/api/redesign/receive/';
  
  // Validate data before sending
  if (!productData.id || !productData.productName || !productData.platform || !productData.userName || !productData.originalUrl) {
    throw new Error('Missing required information: id, productName, platform, userName or originalUrl');
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
  
  // Debug: Check originalUrl in background script
  console.log('🔍 BACKGROUND DEBUG originalUrl:', productData.originalUrl);
  console.log('🔍 BACKGROUND DEBUG full productData keys:', Object.keys(productData));
  
  // Skip test connection because server only supports POST method
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
    
    // Debug: Check JSON body before sending
    const requestBody = JSON.stringify(productData);
    console.log('🔍 REQUEST BODY originalUrl check:', requestBody.includes('originalUrl'));
    console.log('🔍 REQUEST BODY preview:', requestBody.substring(0, 500) + '...');
    
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
    
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
      body: requestBody,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Cancel timeout if request succeeds
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API Error: ${response.status} - ${response.statusText}. Details: ${errorText}`);
    }
    
    // Check response content type
    const contentType = response.headers.get('content-type');
    console.log('Response content-type:', contentType);
    
    // Get response text first to check
    const responseText = await response.text();
    console.log('Raw response text:', responseText.substring(0, 200) + '...');
    
    // Check if it's JSON
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Server did not return JSON:', responseText);
      throw new Error(`Server returned ${contentType || 'unknown'} instead of JSON. Response: ${responseText.substring(0, 100)}...`);
    }
    
    // Parse JSON
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('API Success Response:', result);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response text:', responseText);
      throw new Error(`Server returned invalid JSON data. Response: ${responseText.substring(0, 100)}...`);
    }
    
    return result;
    
  } catch (error) {
    console.error('Background API Request failed:', error);
    
    // Check error type to provide appropriate message
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: Server took too long to respond (>30 seconds).');
    } else if (error.name === 'TypeError' && error.message.includes('redirected')) {
      // If redirected, retry with allow redirect
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
        throw new Error(`Error after retry: ${retryError.message}`);
      }
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to server (${new URL(API_URL).host}). Please check if server is running.`);
    } else if (error.message.includes('CORS')) {
      throw new Error('CORS error: Server has not allowed access from extension.');
    } else {
      throw new Error(`Data sending error: ${error.message}`);
    }
  }
} 