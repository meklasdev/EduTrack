<p align="center">
  <img src="logo.svg" width="180" alt="EduTrack Logo">
</p>

<h1 align="center">EduTrack Pro v1.0</h1>

<p align="center">
  <strong>The Ultimate Classroom Management & Automated Exam System for Technical Schools</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Ubuntu%20%7C%20Windows-green.svg" alt="Platform">
  <img src="https://img.shields.io/badge/License-Proprietary-red.svg" alt="License">
</p>

---

## 🌟 Overview

**EduTrack Pro** is a high-performance ecosystem designed for IT teachers and technical school administrators. It streamlines the examination process by providing a secure student terminal, real-time monitoring, and an automated grading engine that understands formulas, values, and formatting.

## 🚀 Key Features

### 🖥️ Student Exam Terminal
- **Integrated Spreadsheet:** Native `jspreadsheet` implementation for Excel tasks.
- **Documentation Assistant:** Built-in searchable help for INF.02, INF.03, C++, and Excel formulas.
- **Proactive Lockdown:** Auto-maximizing and focus-locking to keep students on task.

### 🛡️ Advanced Anti-Cheat System
- **AI Tool Detection:** Real-time alerts for ChatGPT, Claude, Gemini, DeepSeek, Ollama, and more.
- **Window Title Tracking:** Monitors foreground applications using native Windows APIs.
- **Alt-Tab Monitoring:** Immediate notification to the teacher when a student leaves the exam window.
- **Communicator Block:** Detects Discord, WhatsApp, Messenger, and other unauthorized tools.

### 📊 Teacher Command Center
- **Live Monitoring:** Real-time screen thumbnails and activity timelines.
- **Dynamic Task Creation:** Upload `.xlsx` templates on the fly for automated grading.
- **Remote Controls:** One-click screen locking, messaging, and exam distribution.
- **Incident Logs:** Detailed history of all security alerts and student actions.

### 🤖 Intelligent Grading Engine
- **"MOS" Style Analysis:** Validates values, formula logic (case-insensitive, normalized), and cell styles (e.g., bold).
- **Instant Feedback:** Automated score calculation and report generation.

---

## 🛠️ Technology Stack

- **Server:** Node.js, Express, Socket.io, ExcelJS
- **Client:** Electron, Socket.io-client, JSpreadsheet
- **Discovery:** Bonjour/mDNS for zero-config LAN connectivity
- **Monitoring:** Windows PowerShell & User32 API integration

---

## 💻 Installation

### Ubuntu Server Setup
1. Clone the repository to your server.
2. Run the automated setup script:
   ```bash
   chmod +x setup-ubuntu.sh
   ./setup-ubuntu.sh
   ```
3. Start the server:
   ```bash
   cd server && npm start
   ```

### Student Agent Setup
1. Install dependencies:
   ```bash
   cd app-student && npm install
   ```
2. Start the agent:
   ```bash
   npm start
   ```

---

## 🔐 Configuration

- **Admin Password:** Default is `edutrack2025`
- **Server Port:** `8080`
- **Template Directory:** `server/test-data/`

---

<p align="center">
  Built with ❤️ for better education.
</p>
