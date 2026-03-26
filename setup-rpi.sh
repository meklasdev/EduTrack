#!/bin/bash

# 🍓 EduTrack Pro: Raspberry Pi OS Setup Script
# Automates the setup of the student agent on ARM-based devices.

echo "EduTrack Pro: Starting Raspberry Pi Setup..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install system dependencies for Electron
echo "Installing Electron dependencies..."
sudo apt install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libx11-xcb1 \
  libxcb-dri3-0 \
  libdrm2 \
  libgbm1 \
  libasound2 \
  git \
  curl

# Install Node.js if not present
if ! command -v node &> /dev/null
then
    echo "Node.js not found. Installing Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "Node.js $(node -v) is already installed."
fi

# Setup app-student
echo "Setting up EduTrack Student Agent..."
cd app-student || { echo "Directory 'app-student' not found. Exiting."; exit 1; }
npm install

echo "Setup complete! You can now start the agent using: cd app-student && npm start"
