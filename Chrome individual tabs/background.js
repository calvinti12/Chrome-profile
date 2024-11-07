let profileCounter = 0;
const profiles = new Map();

chrome.runtime.onInstalled.addListener(() => {
  console.log("Profile Isolation Extension Installed");
  // Test native messaging connection
  testNativeConnection();
});

function testNativeConnection() {
  chrome.runtime.sendNativeMessage('com.isolated.tabs.host', 
    { type: 'TEST_CONNECTION' }, 
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('Native messaging connection failed:', chrome.runtime.lastError.message);
      } else {
        console.log('Native messaging connection successful:', response);
      }
    }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openIsolatedTab') {
    createIsolatedProfile(message.url).then(result => {
      sendResponse(result);
    }).catch(error => {
      console.error('Profile creation error:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep the message channel open for async response
  }
});

async function createIsolatedProfile(url) {
  try {
    if (!url) {
      throw new Error('URL is required');
    }

    profileCounter++;
    const profileName = `isolated_profile_${Date.now()}_${profileCounter}`;
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendNativeMessage(
        'com.isolated.tabs.host',
        {
          type: 'CREATE_PROFILE',
          profileName: profileName,
          url: url
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Native messaging error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response) {
            reject(new Error('No response from native host'));
            return;
          }

          console.log('Native host response:', response);

          if (response.success) {
            profiles.set(profileName, {
              createdAt: Date.now(),
              url: url
            });
            resolve({ success: true, profileName: profileName });
          } else {
            reject(new Error(response.error || 'Failed to create profile'));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in createIsolatedProfile:', error);
    throw error;
  }
}

// Clean up profiles when extension is unloaded
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension being unloaded, cleaning up profiles...');
  profiles.clear();
});


