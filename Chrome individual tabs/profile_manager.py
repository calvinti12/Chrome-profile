#!/usr/bin/env python3
import sys
import json
import struct
import subprocess
import os
import tempfile
import shutil
import logging

# Set up logging
logging.basicConfig(
    filename=os.path.join(tempfile.gettempdir(), 'chrome_profile_manager.log'),
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def get_message():
    try:
        raw_length = sys.stdin.buffer.read(4)
        if not raw_length:
            logging.warning("No message length received")
            return None
        message_length = struct.unpack('=I', raw_length)[0]
        message = sys.stdin.buffer.read(message_length)
        return json.loads(message)
    except Exception as e:
        logging.error(f"Error reading message: {str(e)}")
        return None

def send_message(message):
    try:
        encoded = json.dumps(message).encode('utf-8')
        sys.stdout.buffer.write(struct.pack('=I', len(encoded)))
        sys.stdout.buffer.write(encoded)
        sys.stdout.buffer.flush()
        logging.debug(f"Sent message: {message}")
    except Exception as e:
        logging.error(f"Error sending message: {str(e)}")

def create_chrome_profile(profile_name, url):
    try:
        logging.info(f"Creating profile: {profile_name} for URL: {url}")
        
        # Create profile directory
        user_data_dir = os.path.join(tempfile.gettempdir(), profile_name)
        os.makedirs(user_data_dir, exist_ok=True)
        
        # Set the exact path to the extension
        extension_path = os.path.expanduser(
            "~/Library/Application Support/Google/Chrome/Default/Extensions/padekgcemlokbadohgkifijomclgjgif/1.0.0.6_0"  # Update version number
        )
        
        chrome_path = get_chrome_path()
        cmd = [
            chrome_path,
            f'--user-data-dir={user_data_dir}',
            '--no-first-run',
            '--no-default-browser-check',
            '--enable-extensions',
            f'--load-extension={extension_path}',
            '--disable-extensions-except=padekgcemlokbadohgkifijomclgjgif',
            '--whitelisted-extension-id=padekgcemlokbadohgkifijomclgjgif',
            url
        ]
        
        # Log the full command for debugging
        logging.debug(f"Launching Chrome with command: {' '.join(cmd)}")
        
        # Use shell=True for complex paths
        subprocess.Popen(' '.join(cmd), shell=True)
        return {"success": True, "profile_path": user_data_dir}
    except Exception as e:
        logging.error(f"Error creating profile: {str(e)}")
        return {"success": False, "error": str(e)}

def get_chrome_path():
    if sys.platform == "win32":
        paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
        ]
        for path in paths:
            if os.path.exists(path):
                return path
        raise Exception("Chrome executable not found")
    elif sys.platform == "darwin":
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    else:
        return "google-chrome"

def main():
    logging.info("Profile manager started")
    try:
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
    except Exception as e:
        logging.error(f"Main loop error: {str(e)}")
        send_message({"success": False, "error": str(e)})

if __name__ == '__main__':
    main()