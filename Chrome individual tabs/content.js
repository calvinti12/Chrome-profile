// This function ensures isolated data storage for each tab
function initializeTabIsolation() {
  const tabId = window.location.href;  // Use the tab's URL as a unique identifier

  chrome.storage.local.get([`tab_data_${tabId}`], (result) => {
    if (!result[`tab_data_${tabId}`]) {
      // If no data for this tab exists, initialize it
      const tabData = { timestamp: Date.now() };
      chrome.storage.local.set({ [`tab_data_${tabId}`]: tabData });
    } else {
      // If data exists, update it
      const tabData = result[`tab_data_${tabId}`];
      tabData.timestamp = Date.now();
      chrome.storage.local.set({ [`tab_data_${tabId}`]: tabData });
    }
  });

  // Optionally send a message back to background or popup
  chrome.runtime.sendMessage({
    action: 'updateTabData',
    tabId,
    timestamp: Date.now()
  });
}

// Initialize per-tab isolation
initializeTabIsolation();

// Content script for additional isolation
(() => {
  // Prevent cross-window communication
  window.opener = null;
  
  // Clear localStorage for this origin
  window.localStorage.clear();
  
  // Clear sessionStorage for this origin
  window.sessionStorage.clear();
  
  // Disable shared workers
  if (window.SharedWorker) {
    window.SharedWorker = undefined;
  }
  
  // Monitor and block potential cross-origin requests
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    xhr.open = function() {
      // Add isolation headers to requests
      xhr.setRequestHeader('Sec-Fetch-Site', 'same-origin');
      return originalOpen.apply(this, arguments);
    };
    return xhr;
  };
})();

