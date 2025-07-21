// Get elements
const nameForm = document.getElementById('nameForm');
const userInfo = document.getElementById('userInfo');
const userNameInput = document.getElementById('userName');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const saveBtn = document.getElementById('saveBtn');
const errorMessage = document.getElementById('errorMessage');
const displayName = document.getElementById('displayName');
const usageCount = document.getElementById('usageCount');
const changeNameBtn = document.getElementById('changeNameBtn');
const statusText = document.getElementById('statusText');

// Check saved name when popup loads
document.addEventListener('DOMContentLoaded', function() {
  if (chrome && chrome.storage) {
    chrome.storage.local.get(['userName', 'usageCount'], function(result) {
      if (chrome.runtime.lastError) {
        console.error('Error getting storage:', chrome.runtime.lastError);
        showNameForm();
        return;
      }
      
      if (result.userName) {
        const currentUsageCount = result.usageCount || 0;
        showUserInfo(result.userName, currentUsageCount);
      } else {
        showNameForm();
      }
    });
  } else {
    console.error('Chrome storage API not available');
    showNameForm();
  }
});

// Handle save name and login info
saveBtn.addEventListener('click', function() {
  const name = userNameInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  // Validate name (main requirement)
  if (!name) {
    showError('Please enter your name');
    return;
  }

  if (name.length < 2) {
    showError('Name must be at least 2 characters');
    return;
  }

  // Validate username (bypass - just check basic format)
  if (!username) {
    showError('Please enter username');
    return;
  }

  if (username.length < 2) {
    showError('Username must be at least 2 characters');
    return;
  }

  // Validate password (bypass - just check basic format)
  if (!password) {
    showError('Please enter password');
    return;
  }

  if (password.length < 3) {
    showError('Password must be at least 3 characters');
    return;
  }

  // Disable button while saving
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  // Save all info to storage (main logic still based on userName)
  const userData = {
    userName: name,
    username: username,
    password: password, // In bypass mode, just store it
    loginTime: new Date().toISOString()
  };

  chrome.storage.local.set({ userName: name, userLogin: userData }, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving to storage:', chrome.runtime.lastError);
      showError('Error saving information. Please try again.');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save and Start';
      return;
    }

    console.log('User information saved successfully:', name);
    showUserInfo(name, 0); // New user starts with 0 usage
    
    // Notify content script that name has been saved (keep original logic)
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'nameUpdated', name: name, username: username}, function(response) {
          if (chrome.runtime.lastError) {
            console.log('Content script not available, but info is saved');
          }
        });
      }
    });
    
    // Reset button
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save and Start';
  });
});

// Handle change info
changeNameBtn.addEventListener('click', function() {
  showNameForm();
  // Clear all inputs
  userNameInput.value = '';
  usernameInput.value = '';
  passwordInput.value = '';
});

// Handle Enter key press - navigate through fields
userNameInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    usernameInput.focus();
  }
});

usernameInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    passwordInput.focus();
  }
});

passwordInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    saveBtn.click();
  }
});

// Handle input to hide error
userNameInput.addEventListener('input', function() {
  hideError();
});

usernameInput.addEventListener('input', function() {
  hideError();
});

passwordInput.addEventListener('input', function() {
  hideError();
});

function showNameForm() {
  nameForm.classList.remove('hidden');
  userInfo.classList.remove('show');
  statusText.textContent = 'Please enter your information to start';
  setTimeout(() => {
    userNameInput.focus();
  }, 100);
}

function showUserInfo(name, currentUsageCount = 0) {
  nameForm.classList.add('hidden');
  userInfo.classList.add('show');
  displayName.textContent = name;
  usageCount.textContent = currentUsageCount;
  statusText.textContent = 'Ready to use';
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
  userNameInput.classList.add('error');
  usernameInput.classList.add('error');
  passwordInput.classList.add('error');
}

function hideError() {
  errorMessage.classList.remove('show');
  userNameInput.classList.remove('error');
  usernameInput.classList.remove('error');
  passwordInput.classList.remove('error');
} 