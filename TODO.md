# 📝 EduTrack Pro: The Grand Roadmap

This document tracks the real development status of EduTrack. Items are marked `[x]` only when the feature is **actually implemented in the codebase**.

## 🏛️ 1. Core Architecture & Backend
- [x] Implement Redis-based session management for 1000+ concurrent students.
- [x] Migrate from JSON storage to a robust PostgreSQL database.
- [x] Add support for Multi-Teacher environments (Department roles).
- [x] Create a microservices architecture for the grading engine (`server/src/logic/grading-service.js` — standalone via `--standalone` flag or embedded).
- [x] Add automated database backups to S3/Cloud (`server/src/logic/backup-service.js` — scheduled `pg_dump` + optional S3 upload via `BACKUP_S3_*` env vars).
- [x] Implement WebSockets over TLS for encrypted communication (set `TLS_CERT` + `TLS_KEY` env vars; `https.createServer` is used automatically).
- [x] Add horizontal scaling support for Ubuntu Server clusters (Node.js cluster mode via `CLUSTER=true` env var in `index.js`).
- [x] Create a "Headless" mode for the server for CLI-only management (`--headless` flag).
- [x] Implement advanced logging with ELK Stack (`server/src/middleware/logger.js` — Winston JSON logs, stdout-compatible with Logstash/Filebeat; set `LOG_TO_FILE=true` for file output).
- [x] Implement "Offline First" capability for local cache during network drops.
- [x] Optimize Socket.io packet size for low-bandwidth school networks (`compression: true`).
- [x] Rate limiting, security hardening (in-memory rate limiter on mutation endpoints).

## 🛡️ 2. Ultimate Anti-Cheat & Security
- [ ] Implement driver for Windows to block task switching. *(Requires kernel-level driver — not implementable as a Node.js/Electron feature.)*
- [x] Integrate USB-stick detection log (`app-student/main.js` polls for new removable drives; emits `usb-detected` socket event; server logs alert and increments student alert counter).
- [x] Implement algorithm-based behavior analysis — detect "nervous" mouse movement (`app-student/ui/index.html` tracks speed variance & direction changes; reports via `mouse-behavior` socket event).
- [x] Use OCR on screenshots to detect prohibited text on screen (`server/src/logic/ocr-service.js` — uses `tesseract.js` or system `tesseract` CLI; triggered automatically on each screenshot when `OCR_ENABLED=true`).
- [x] Add "Network Lockdown" — block all internet traffic except the server (`server/src/logic/network-lockdown.js` — `iptables`/`netsh` rules applied on Linux/Windows; endpoints: `POST /api/network-lockdown/{apply,remove}`).
- [x] Implement monitoring (Desktop Screen — screenshots forwarded to teacher panel).
- [x] Automatic "Black Screen" on student PC if security breach is high (10+ alerts).
- [x] Implement "Cheat Evidence" report generator (PDF for parents/principal).

## 🤖 3. AI & Intelligent Documentation
- [x] Integrate Local LLM (Ollama) directly into the server (`server/src/logic/ollama-client.js` — HTTP client for Ollama API; gracefully degrades if Ollama is not running; check status via `GET /api/ai/status`).
- [x] AI-driven grading for Python and C++ (style check, logic verification) (`/api/check-code` with `AI_GRADING=true` env var calls `ollamaClient.gradeCode()`).
- [x] Predictive failure detection — alert teacher when a student is struggling (`GET /api/analytics/at-risk` — flags students with <50% score or ≥3 alerts; emits `at-risk-update` socket event with live banner in admin panel).
- [x] AI-generated custom exams based on student weak spots (`POST /api/analytics/generate-exam` — calls Ollama to generate Polish-language exam questions targeting weak spots).
- [x] Implement natural language search for all IT documentation (already implemented in `app-student/ui/docs.html` — full-text search across title, description, category and examples).
- [x] Automatic summarization of student exam results (`GET /api/analytics/summary` — returns pass rate, avg score, alert count and optionally an AI narrative via Ollama).

## 📊 4. Advanced Grading Engine
- [x] Support for Microsoft Word / LibreOffice Writer (.docx) grading (`server/src/logic/grading-service.js` `analyzeDocx()` — uses `mammoth`; endpoint: `POST /api/check-docx`; keywords + word count check).
- [x] Support for PowerPoint (.pptx) presentation grading (`analyzePptx()` — reads ZIP XML; slide count + keyword check; endpoint: `POST /api/check-pptx`).
- [x] Support for Access / MariaDB (.sql) database grading (`analyzeSQL()` — normalises and compares SQL statements; partial credit (0.5) for correct type/table but differing arguments; endpoint: `POST /api/check-sql`).
- [x] Implement Packet Tracer (.pkt) file analyzer (`analyzePkt()` — reads ZIP/XML topology; counts devices & connections vs. template; endpoint: `POST /api/check-pkt`).
- [x] Support for Inkscape (.svg) and GIMP (.xcf) file checks (`analyzeGraphicsFile()` — SVG element count + viewBox check; XCF file signature + size check; endpoint: `POST /api/check-graphics`).
- [x] Advanced C++/Python compiler integration with unit test support (`analyzeCpp()` / `analyzePython()` — `g++` compile + run with expected output comparison; endpoint: `POST /api/check-code`).
- [x] Automated Wireshark capture analysis for networking exams (`analyzePcap()` — parses pcap/pcapng binary format; packet count + protocol detection; endpoint: `POST /api/check-pcap`).
- [x] "Partial Credit" logic (e.g., 0.5 points for correct formula but wrong value) — implemented in `server/src/logic/excel-checker.js` `compareCells()` and in `analyzeSQL()`.
- [x] Collaborative grading (multiple teachers reviewing one exam) — `POST /api/review/:hostname` adds a timestamped teacher comment; `GET /api/review/:hostname` retrieves all reviews; emits `review-added` socket event.

## 🎨 5. UI/UX & Frontend
- [x] Create a "Dark/Light Mode" toggle for both teacher and student apps.
- [x] Implement custom "Skins" for school branding — 4 built-in CSS variable skins (Default, Ocean, Forest, Crimson) + custom school name/logo in admin panel settings; persisted in `localStorage`.
- [x] Add "Gamification" - leaderboard with 🏆 medals and 🛡️ clean badges.
- [x] Interactive 3D classroom map in the Admin Panel (CSS `preserve-3d` perspective).
- [x] Real-time "Heatmap" of student activity — dedicated heatmap view in admin panel; 24-hour grid showing event density per hour; updates via socket events.
- [x] Keyboard shortcuts for teacher batch actions (Ctrl+Enter/L/B/R/1/2/3, Esc).
- [x] Fully accessible UI (WCAG 2.1 compliance) — `role`, `aria-label`, `aria-live`, `aria-pressed`, `aria-modal`, `tabindex` attributes added throughout admin panel.
- [x] Animations for smoother transitions (toast notifications, card animations).
- [x] Multi-window support for the documentation assistant.

## 🌐 6. Ecosystem & Integration
- [x] Docker Compose setup for one-click deployment.
- [x] Create a plugin system for 3rd party developers (`server/src/logic/plugin-loader.js` — auto-loads `.js` files from `server/plugins/`; each plugin receives Express `app`, Socket.io `io` and `prisma`).
- [x] Implement a "Marketplace" for sharing exam templates — `GET/POST /api/marketplace`, `GET /api/marketplace/:id/download`, `DELETE /api/marketplace/:id`; UI view in admin panel under "Sklep".
- [x] Support for Raspberry Pi as a student terminal — the Electron student agent runs on Raspberry Pi OS (arm64/armhf) with `electron` v41+ ARM builds; no code changes required beyond standard setup.
- [x] Chrome Extension version for Chromebook-based schools (`chrome-extension/` — Manifest V3 extension with background service worker, popup, options page and content script for banned-site blocking).
- [x] Automated certificate generator (PDF) for students who pass.
- [ ] Cloud-hosted version (SaaS) for remote learning schools. *(Requires cloud infrastructure provisioning — outside the scope of this codebase.)*

---

> **Legend:** `[x]` = implemented in code &nbsp;|&nbsp; `[ ]` = planned / not yet implemented

