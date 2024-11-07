document.getElementById('openTabButton').addEventListener('click', () => {
  const url = document.getElementById('url').value;
  if (url) {
    chrome.runtime.sendMessage({
      action: 'openIsolatedTab',
      url: url
    });
    window.close(); // Close popup after opening tab
  } else {
    alert("Please enter a valid URL");
  }
});
