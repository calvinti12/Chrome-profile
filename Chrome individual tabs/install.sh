#!/bin/bash

# Define paths
BASE_DIR="$HOME/chrome-profile-isolator"
CHROME_NATIVE_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST_NAME="com.isolated.tabs.host.json"
SCRIPT_NAME="profile_manager.py"

echo "Installing Chrome Profile Isolator..."

# Create necessary directories
mkdir -p "$CHROME_NATIVE_DIR"
mkdir -p "$BASE_DIR"

# Create manifest file
cat > "$BASE_DIR/$MANIFEST_NAME" << EOL
{
  "name": "com.isolated.tabs.host",
  "description": "Chrome Profile Isolation Native Host",
  "path": "$BASE_DIR/profile_manager.py",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://nhiemhkpeiggheoohbcfdlbaiebkpnhn/"
  ]
}
EOL

# Create Python script
cat > "$BASE_DIR/$SCRIPT_NAME" << EOL
#!/usr/bin/env python3
import sys
import json
import struct
import subprocess
import os
import tempfile
import logging

logging.basicConfig(
    filename=os.path.join(tempfile.gettempdir(), 'chrome_profile_manager.log'),
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def get_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    message_length = struct.unpack('=I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length)
    return json.loads(message)

def send_message(message):
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('=I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

def create_chrome_profile(profile_name, url):
    try:
        logging.info(f"Creating profile: {profile_name} for URL: {url}")
        
        user_data_dir = os.path.join(tempfile.gettempdir(), profile_name)
        os.makedirs(user_data_dir, exist_ok=True)
        
        chrome_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        
        cmd = [
            chrome_path,
            f'--user-data-dir={user_data_dir}',
            '--no-first-run',
            '--no-default-browser-check',
            url
        ]
        
        subprocess.Popen(cmd)
        return {"success": True, "profile_path": user_data_dir}
    except Exception as e:
        logging.error(f"Error creating profile: {str(e)}")
        return {"success": False, "error": str(e)}

def main():
    logging.info("Profile manager started")
    while True:
        message = get_message()
        if not message:
            break
            
        logging.debug(f"Received message: {message}")
        
        if message.get('type') == 'TEST_CONNECTION':
            send_message({"success": True, "message": "Connection successful"})
        elif message.get('type') == 'CREATE_PROFILE':
            response = create_chrome_profile(
                message['profileName'],
                message['url']
            )
            send_message(response)
        else:
            send_message({"success": False, "error": "Unknown command"})

if __name__ == '__main__':
    main()
EOL

# Make Python script executable
chmod +x "$BASE_DIR/$SCRIPT_NAME"

# Create symbolic link to manifest
ln -sf "$BASE_DIR/$MANIFEST_NAME" "$CHROME_NATIVE_DIR/$MANIFEST_NAME"

echo "Installation complete!"
echo "Python script location: $BASE_DIR/$SCRIPT_NAME"
echo "Manifest location: $CHROME_NATIVE_DIR/$MANIFEST_NAME"
echo "Please restart Chrome for the changes to take effect."