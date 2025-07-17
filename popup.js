// Lấy các element
const nameForm = document.getElementById('nameForm');
const userInfo = document.getElementById('userInfo');
const userNameInput = document.getElementById('userName');
const saveBtn = document.getElementById('saveBtn');
const errorMessage = document.getElementById('errorMessage');
const displayName = document.getElementById('displayName');
const changeNameBtn = document.getElementById('changeNameBtn');
const statusText = document.getElementById('statusText');

// Kiểm tra tên đã lưu khi load popup
document.addEventListener('DOMContentLoaded', function() {
  if (chrome && chrome.storage) {
    chrome.storage.local.get(['userName'], function(result) {
      if (chrome.runtime.lastError) {
        console.error('Error getting storage:', chrome.runtime.lastError);
        showNameForm();
        return;
      }
      
      if (result.userName) {
        showUserInfo(result.userName);
      } else {
        showNameForm();
      }
    });
  } else {
    console.error('Chrome storage API not available');
    showNameForm();
  }
});

// Xử lý lưu tên
saveBtn.addEventListener('click', function() {
  const name = userNameInput.value.trim();
  
  if (!name) {
    showError('Vui lòng nhập tên của bạn');
    return;
  }

  if (name.length < 2) {
    showError('Tên phải có ít nhất 2 ký tự');
    return;
  }

  // Disable button while saving
  saveBtn.disabled = true;
  saveBtn.textContent = 'Đang lưu...';

  // Lưu tên vào storage
  chrome.storage.local.set({ userName: name }, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving to storage:', chrome.runtime.lastError);
      showError('Có lỗi khi lưu tên. Vui lòng thử lại.');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Lưu và Bắt Đầu';
      return;
    }

    console.log('Tên đã lưu thành công:', name);
    showUserInfo(name);
    
    // Thông báo cho content script biết tên đã được lưu
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'nameUpdated', name: name}, function(response) {
          if (chrome.runtime.lastError) {
            console.log('Content script not available, but name is saved');
          }
        });
      }
    });
    
    // Reset button
    saveBtn.disabled = false;
    saveBtn.textContent = 'Lưu và Bắt Đầu';
  });
});

// Xử lý đổi tên
changeNameBtn.addEventListener('click', function() {
  showNameForm();
  userNameInput.value = '';
});

// Xử lý nhập Enter
userNameInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    saveBtn.click();
  }
});

// Xử lý input để ẩn lỗi
userNameInput.addEventListener('input', function() {
  hideError();
});

function showNameForm() {
  nameForm.classList.remove('hidden');
  userInfo.classList.remove('show');
  statusText.textContent = 'Vui lòng nhập tên để bắt đầu';
  setTimeout(() => {
    userNameInput.focus();
  }, 100);
}

function showUserInfo(name) {
  nameForm.classList.add('hidden');
  userInfo.classList.add('show');
  displayName.textContent = name;
  statusText.textContent = 'Sẵn sàng sử dụng';
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  userNameInput.classList.add('error');
}

function hideError() {
  errorMessage.classList.remove('show');
  userNameInput.classList.remove('error');
} 