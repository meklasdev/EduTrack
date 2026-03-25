#!/bin/bash

# EduTrack Server Auto-Installer for Ubuntu
# @author Jules
# @version 1.0

echo "--- EDU-TRACK SERVER SETUP ---"

# 1. Update & Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# 2. Install Project Dependencies
echo "[1/3] Installing Node.js packages..."
cd server && npm install

# 3. Setup Folders
echo "[2/3] Preparing data directories..."
mkdir -p test-data public/uploads

# 4. Final check
echo "[3/3] Verification..."
if node -v > /dev/null; then
    echo "SUCCESS: Node.js installed."
    echo "To start the server, run: cd server && npm start"
else
    echo "ERROR: Node.js installation failed."
fi

echo "--- SETUP COMPLETE ---"
