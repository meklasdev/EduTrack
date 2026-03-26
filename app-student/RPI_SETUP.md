# 🍓 Raspberry Pi Setup for EduTrack Student Agent

This guide explains how to deploy the EduTrack Electron agent on Raspberry Pi (ARM) devices, making them ideal low-cost student terminals.

## 📋 Prerequisites
- Raspberry Pi 4B or 5 (recommended 4GB RAM).
- Raspberry Pi OS (64-bit) with Desktop environment.
- Node.js 18+ installed.

## 🚀 Quick Setup
Run the automated setup script from the repository root:
```bash
chmod +x setup-rpi.sh
./setup-rpi.sh
```

## 🛠️ Manual Installation

### 1. Install System Dependencies
Electron requires several libraries to run on Linux:
```bash
sudo apt update
sudo apt install -y libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcb-dri3-0 libdrm2 libgbm1 libasound2
```

### 2. Install Node.js
If you don't have Node.js, install it via NodeSource:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Build & Launch
```bash
cd app-student
npm install
npm start
```

## 🔒 Optimization for Exams
- **Kiosk Mode:** Use `matchbox-window-manager` to force Electron into a true full-screen kiosk mode.
- **Autostart:** Add the `npm start` command to `~/.config/lxsession/LXDE-pi/autostart`.

---
*EduTrack Pro: Democratizing Education with Low-Cost Hardware.*
