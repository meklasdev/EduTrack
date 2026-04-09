<div align="center">

<!-- Animated header banner -->
<a href="https://meklasdev.github.io/EduTrack/" target="_blank">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=6264a7&height=200&section=header&text=EduTrack%20Pro&fontSize=56&fontColor=ffffff&fontAlignY=40&desc=Profesjonalny%20System%20Egzaminów%20Informatycznych&descAlignY=62&descSize=17&animation=fadeIn" width="100%"/>
</a>

<br/>

<!-- Badges row 1 -->
<img src="https://img.shields.io/badge/Wersja-2.0.0-6264a7?style=for-the-badge&logo=github&logoColor=white" alt="Version"/>
&nbsp;
<img src="https://img.shields.io/badge/Status-Production%20Ready-4ec994?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Status"/>
&nbsp;
<img src="https://img.shields.io/badge/Platform-Ubuntu%20%7C%20Windows%20%7C%20Docker-0078d4?style=for-the-badge&logo=linux&logoColor=white" alt="Platform"/>

<br/><br/>

<!-- Badges row 2 -->
<img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node"/>
&nbsp;
<img src="https://img.shields.io/badge/PostgreSQL-Prisma%20ORM-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
&nbsp;
<img src="https://img.shields.io/badge/Redis-Session%20Store-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis"/>
&nbsp;
<img src="https://img.shields.io/badge/Electron-Desktop%20Agent-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron"/>
&nbsp;
<img src="https://img.shields.io/badge/Socket.io-Real--Time-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.io"/>
&nbsp;
<img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>
&nbsp;
<img src="https://img.shields.io/badge/Ollama-Local%20LLM-ffffff?style=flat-square&logo=ollama&logoColor=black" alt="Ollama"/>

<br/><br/>

<!-- Exams badges -->
<img src="https://img.shields.io/badge/Egzamin-INF.02-8b8dc7?style=flat-square" alt="INF.02"/>
&nbsp;
<img src="https://img.shields.io/badge/Egzamin-INF.03-8b8dc7?style=flat-square" alt="INF.03"/>
&nbsp;
<img src="https://img.shields.io/badge/Egzamin-INF.04-8b8dc7?style=flat-square" alt="INF.04"/>
&nbsp;
<img src="https://img.shields.io/badge/Roadmap-47%2F49%20done-4ec994?style=flat-square" alt="Roadmap"/>
&nbsp;
<img src="https://img.shields.io/badge/License-Proprietary-e05a6a?style=flat-square" alt="License"/>

<br/><br/>

<p><strong>EduTrack Pro</strong> to zaawansowany ekosystem do zarządzania egzaminami informatycznymi —<br/>
od automatycznego sprawdzania arkuszy Excel i wieloformatowego oceniania AI<br/>
po monitoring antycheatowy z analizą OCR i blokadą sieci w czasie rzeczywistym.</p>

<br/>

<a href="https://meklasdev.github.io/EduTrack/" target="_blank">
  <img src="https://img.shields.io/badge/%F0%9F%8C%90%20Podgląd%20interaktywny-Otwórz%20demo-6264a7?style=for-the-badge" alt="Preview"/>
</a>
&nbsp;&nbsp;
<a href="#-instalacja">
  <img src="https://img.shields.io/badge/%F0%9F%9A%80%20Szybki%20start-Instalacja-4ec994?style=for-the-badge" alt="Install"/>
</a>

</div>

---

## 📋 Spis treści

- [🌟 O projekcie](#-o-projekcie)
- [✨ Kluczowe funkcje](#-kluczowe-funkcje)
- [🛠️ Stack technologiczny](#️-stack-technologiczny)
- [📁 Struktura projektu](#-struktura-projektu)
- [💻 Instalacja](#-instalacja)
- [🔐 Konfiguracja](#-konfiguracja)
- [📝 API Reference](#-api-reference)
- [⌨️ Skróty klawiszowe](#️-skróty-klawiszowe)
- [🗺️ Roadmap](#️-roadmap)

---

## 🌟 O projekcie

**EduTrack Pro** to profesjonalny ekosystem dla nauczycieli informatyki w technikach i szkołach zawodowych. System łączy w sobie:

| Komponent | Opis |
|-----------|------|
| **Terminal Ucznia** | Przeglądarkowy lub desktopowy (Electron) interfejs do egzaminów z arkuszami |
| **Panel Nauczyciela** | Dashboard w stylu Microsoft Teams z monitoringiem RT, mapą 3D, heatmapą |
| **MultiGrader** | Automatyczna ocena `.xlsx`, `.docx`, `.pptx`, `.sql`, `.pkt`, `.svg/.xcf`, `.pcap`, C++, Python |
| **Anti-Cheat Engine** | OCR zrzutów, wykrywanie AI, analiza myszy, blokada sieci, detekcja USB |
| **AI Engine** | Lokalny LLM (Ollama) — generowanie egzaminów, ocenianie kodu, analiza wyników |
| **System Raportów** | PDF cheat evidence, certyfikaty, JSON exports, detekcja plagiatów |
| **Chrome Extension** | Rozszerzenie Manifest V3 dla szkół Chromebook — blokada zabronionych stron |
| **Plugin System** | Otwarte API dla wtyczek 3rd-party (`server/plugins/`) |

---

## ✨ Kluczowe funkcje

### 🖥️ Terminal Ucznia (Web + Electron)

- 📊 Wbudowany arkusz kalkulacyjny `jspreadsheet CE v4` z pełnym wsparciem formuł
- ⏱️ **Timer egzaminacyjny** — odmierzanie czasu od startu zadania
- 📚 Asystent dokumentacji z **36 wpisami** (Excel, INF.02, INF.03, INF.04, C++, SQL)
- 🌙 **Dark / Light Mode** — przełącznik motywu z persystencją
- 🔒 Blokada ekranu na polecenie nauczyciela (web + Electron)
- 🎓 Identyfikacja ucznia z modalem logowania (web terminal)
- 🔔 Toast notifications zamiast blokujących `alert()`
- ⚡ **Tryb Offline** — zadanie buforowane lokalnie, wynik wysyłany po reconnect

### 🛡️ System Antycheatowy

- 🤖 Wykrywanie AI: ChatGPT, Claude, Gemini, DeepSeek, Ollama, Copilot i inne
- 👁️ Monitoring okien przez Windows API (PowerShell + User32.dll)
- ⚠️ Alert przy alt-tab / opuszczeniu okna egzaminacyjnego
- 💬 Blokada komunikatorów: Discord, WhatsApp, Messenger, Telegram
- ⬛ Automatyczny **black-screen** po przekroczeniu 10 alertów
- 📸 **OCR zrzutów ekranu** — tesseract.js wykrywa zakazany tekst na ekranie (`OCR_ENABLED=true`)
- 🖱️ **Analiza zachowania myszy** — wykrywanie nerwowych ruchów wskazujących stres
- 🔌 **Wykrywanie USB** — alert przy podłączeniu nośnika wymiennego
- 🌐 **Network Lockdown** — blokada iptables/netsh na stacji ucznia na żądanie
- 📄 Generator raportu "Cheat Evidence" PDF dla dyrektora / rodziców

### 📊 Panel Nauczyciela

- 🖼️ Miniatury ekranów uczniów w czasie rzeczywistym (co 3s)
- 🗺️ **Mapa klasy 3D** z wizualizacją biurek (perspektywa isometryczna)
- 🔥 **Heatmapa aktywności** — siatka 24h z gęstością zdarzeń
- 🏆 **Ranking** z systemem punktów, kar za alerty i medalami 🥇🥈🥉🛡️
- 📬 Wiadomości bezpośrednie, zdalna blokada, black screen per uczeń
- ↺ **Reset alertów** ucznia, przypisanie do działu
- 📊 Paski statystyk: aktywni uczniowie, łączne alerty, średni wynik
- 🛒 **Marketplace szablonów** — udostępnianie i pobieranie wzorców egzaminów
- ⌨️ 8 skrótów klawiszowych dla szybkiego działania
- 🎨 4 skórki kolorystyczne + tryb jasny, logo/nazwa szkoły

### 🤖 AI & Inteligentna Ocena

- 🧠 **Lokalny LLM (Ollama)** — bez danych w chmurze, endpoint: `GET /api/ai/status`
- 🖥️ **Ocenianie kodu AI** — Python/C++ styl + logika z `AI_GRADING=true`
- ⚠️ **Detekcja zagrożenia** — `GET /api/analytics/at-risk` flaguje uczniów z <50% lub ≥3 alertami
- 📝 **Generowanie egzaminów AI** — `POST /api/analytics/generate-exam` — pytania w języku polskim
- 📊 **Podsumowanie wyników** — `GET /api/analytics/summary` z opcjonalnym narracją AI

### 📁 Wieloformatowy Silnik Oceniania

| Format | Obsługa | Endpoint |
|--------|---------|----------|
| `.xlsx` | Formuły, wartości, formatowanie, tolerancja ±0.01 | `POST /api/check-excel` |
| `.docx` | Słowa kluczowe, liczba słów, struktura akapitów | `POST /api/check-docx` |
| `.pptx` | Liczba slajdów, słowa kluczowe | `POST /api/check-pptx` |
| `.sql` | Normalizacja SQL, partial credit 0.5 za typ/tabelę | `POST /api/check-sql` |
| `.pkt` | Topologia Packet Tracer — liczba urządzeń i połączeń | `POST /api/check-pkt` |
| `.svg/.xcf` | Liczba elementów SVG / sygnatura XCF | `POST /api/check-graphics` |
| `.pcap` | Liczba pakietów, wykrywanie protokołów | `POST /api/check-pcap` |
| `.py / .cpp` | Kompilacja `g++` / interpreter, porównanie wyjścia | `POST /api/check-code` |

### 🔐 Autoryzacja i Wielodepartamentowość

- 🔑 System JWT + bcrypt dla nauczycieli
- 🏢 Rejestracja z przypisaniem do działu / przedmiotu
- 🔒 Izolacja danych: każdy nauczyciel widzi tylko swoich uczniów
- 🛡️ Rate limiting na endpointach mutujących dane (60 req/min)
- 🗄️ Redis-based session management

---

## 🛠️ Stack technologiczny

| Warstwa | Technologia | Rola |
|---------|-------------|------|
| **Backend** | Node.js 20, Express.js | HTTP server, REST API |
| **Real-time** | Socket.io + Redis Adapter | WebSocket — monitoring RT, skalowanie |
| **Baza danych** | PostgreSQL + Prisma ORM | Persistent storage |
| **Cache / Sesje** | Redis | Session store, pub/sub |
| **Arkusze** | ExcelJS, jspreadsheet CE v4 | Grading engine, student UI |
| **Dokumenty** | mammoth (.docx), AdmZip (.pptx/.pkt) | Multi-format grading |
| **Sieć/pcap** | binarny parser | Wireshark .pcap analysis |
| **Kod** | `g++`, `python` CLI | Kompilacja i uruchomienie kodu |
| **AI / LLM** | Ollama HTTP client | Lokalne LLM — ocenianie, generowanie |
| **OCR** | tesseract.js / CLI | Wykrywanie zakazanego tekstu |
| **PDF** | PDFKit | Raporty, certyfikaty |
| **Backup** | node-schedule + AWS S3 SDK | Zaplanowane pg_dump + upload S3 |
| **Desktop** | Electron 28+ | Student agent (Windows / arm64) |
| **Discovery** | Bonjour / mDNS | Auto-discovery w LAN |
| **Auth** | JWT, bcrypt | Bezpieczna autoryzacja |
| **Logowanie** | Winston (JSON/ELK) | Structured logging |
| **Deploy** | Docker Compose | PostgreSQL + Redis stack |
| **Extension** | Chrome MV3 | Student agent dla Chromebook |

---

## 📁 Struktura projektu

```
EduTrack/
├── 📂 server/                   # Backend Node.js + Frontend
│   ├── index.js                 # Serwer główny (Express + Socket.io)
│   ├── 📂 prisma/               # Schema i migracje (PostgreSQL)
│   ├── 📂 public/               # Frontend statyczny
│   │   ├── admin.html           # 🖥️  Panel nauczyciela (Teams-style)
│   │   ├── login.html           # 🔐  Strona logowania
│   │   └── index.html           # 🎓  Terminal ucznia (przeglądarka)
│   ├── 📂 src/
│   │   ├── 📂 logic/
│   │   │   ├── grading-service.js   # MultiGrader — docx/pptx/sql/pkt/pcap/cpp/py/svg
│   │   │   ├── excel-checker.js     # ExcelLogicChecker — formuły, wartości, format
│   │   │   ├── ocr-service.js       # OCR zrzutów ekranu (tesseract.js)
│   │   │   ├── ollama-client.js     # Klient lokalnego LLM (Ollama)
│   │   │   ├── network-lockdown.js  # Blokada sieci iptables/netsh
│   │   │   ├── backup-service.js    # Backup pg_dump + S3
│   │   │   └── plugin-loader.js     # System wtyczek 3rd-party
│   │   ├── 📂 middleware/       # JWT authMiddleware, rate limiter, logger
│   │   └── 📂 routes/           # API routes (auth)
│   ├── 📂 plugins/              # Katalog wtyczek zewnętrznych
│   └── 📂 test-data/            # Szablony .xlsx do oceniania
│
├── 📂 app-student/              # Aplikacja Electron (Windows / RPi agent)
│   ├── main.js                  # Electron main process
│   ├── preload.js               # Context bridge (bezpieczne IPC)
│   └── 📂 ui/
│       ├── index.html           # UI terminala ucznia
│       ├── docs.html            # Asystent dokumentacji (36 wpisów)
│       └── message.html         # Okno wiadomości
│
├── 📂 chrome-extension/         # Rozszerzenie Chrome MV3 (Chromebook)
│   ├── manifest.json            # Manifest V3
│   ├── background.js            # Service worker
│   ├── content.js               # Blokada zabronionych stron
│   ├── popup.html / popup.js    # UI popup
│   └── options.html / options.js# Ustawienia rozszerzenia
│
├── 📂 docs/
│   └── index.html               # 🌐  Interaktywna strona projektu
│
├── docker-compose.yml           # PostgreSQL + Redis
├── setup-ubuntu.sh              # Auto-installer (Ubuntu)
├── TODO.md                      # 🗺️  Roadmap (47/49 zaimplementowane)
└── REQUIREMENTS_INF.md          # Wymagania egzaminacyjne CKE
```

---

## 💻 Instalacja

### Wymagania

- **Ubuntu 20.04+** lub Windows 10+
- **Node.js 20+**
- **Docker** (dla PostgreSQL i Redis)

### Serwer (Ubuntu) — automatyczna instalacja

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/meklasdev/EduTrack.git && cd EduTrack

# 2. Uruchom skrypt instalatora (instaluje Node.js, Docker, zależności)
chmod +x setup-ubuntu.sh && ./setup-ubuntu.sh

# 3. Uruchom bazy danych
docker-compose up -d

# 4. Skonfiguruj środowisko
cd server && cp .env.example .env
# → Edytuj .env: DATABASE_URL, JWT_SECRET, SESSION_SECRET

# 5. Zainicjalizuj bazę danych
npx prisma migrate deploy

# 6. Uruchom serwer
npm start
```

> 🌐 Panel nauczyciela dostępny pod: **`http://localhost:8080/login`**

### Terminal Ucznia — Electron (Windows)

```bash
cd app-student
npm install
npm start
# Agent automatycznie wykrywa serwer EduTrack w sieci LAN przez Bonjour/mDNS
```

> 🌍 Terminal webowy (bez instalacji): **`http://<ip-serwera>:8080`**

---

## 🔐 Konfiguracja

Plik `server/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/edutrack?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="twoj-tajny-klucz-jwt-min-32-znaki"
SESSION_SECRET="twoj-tajny-klucz-sesji"
NODE_ENV="production"
PORT=8080

# Opcjonalne
TLS_CERT="/path/to/cert.pem"       # HTTPS — WebSocket po TLS
TLS_KEY="/path/to/key.pem"
CLUSTER=true                        # Node.js cluster mode (multi-CPU)
OCR_ENABLED=true                    # OCR zrzutów (wymaga tesseract)
AI_GRADING=true                     # Ocenianie kodu przez Ollama
LOG_TO_FILE=true                    # Logi Winston → logs/app.log
BACKUP_S3_BUCKET="moj-bucket"       # Backup bazy do S3
BACKUP_S3_KEY_ID="..."
BACKUP_S3_SECRET="..."
```

---

## 📝 API Reference

> Endpointy oznaczone `🔑 auth` wymagają nagłówka `Authorization: Bearer <token>`.

### Autoryzacja

| Metoda | Endpoint | Auth | Opis |
|--------|----------|:----:|------|
| `POST` | `/api/auth/register` | — | Rejestracja nauczyciela |
| `POST` | `/api/auth/login` | — | Logowanie — zwraca JWT |

### Uczniowie

| Metoda | Endpoint | Auth | Opis |
|--------|----------|:----:|------|
| `GET` | `/api/students` | 🔑 | Lista uczniów w dziale |
| `POST` | `/api/students/:hostname/reset-alerts` | 🔑 | Resetuj alerty ucznia |
| `POST` | `/api/students/:hostname/assign-department` | 🔑 | Przypisz ucznia do działu |

### Ocenianie

| Metoda | Endpoint | Auth | Opis |
|--------|----------|:----:|------|
| `POST` | `/api/check-excel` | — | Sprawdź arkusz `.xlsx` |
| `POST` | `/api/check-code` | — | Sprawdź kod `.py` / `.cpp` |
| `POST` | `/api/check-docx` | — | Sprawdź dokument `.docx` |
| `POST` | `/api/check-pptx` | — | Sprawdź prezentację `.pptx` |
| `POST` | `/api/check-sql` | — | Sprawdź plik `.sql` |
| `POST` | `/api/check-pkt` | — | Sprawdź topologię Packet Tracer |
| `POST` | `/api/check-pcap` | — | Sprawdź przechwyt Wireshark |
| `POST` | `/api/check-graphics` | — | Sprawdź plik `.svg` / `.xcf` |
| `POST` | `/api/upload-template` | 🔑 | Wgraj wzorzec oceniania `.xlsx` |
| `POST` | `/api/detect-plagiarism` | 🔑 | Porównaj pliki uczniów |

### Raporty i certyfikaty

| Metoda | Endpoint | Auth | Opis |
|--------|----------|:----:|------|
| `GET` | `/api/report/:hostname` | 🔑 | Raport JSON ucznia |
| `GET` | `/api/report/:hostname/pdf` | 🔑 | Raport PDF (cheat evidence) |
| `GET` | `/api/certificate/:hostname` | 🔑 | Certyfikat ukończenia (PDF) |
| `GET` | `/api/leaderboard` | — | Ranking uczniów |

### Wspólna ocena

| Metoda | Endpoint | Auth | Opis |
|--------|----------|:----:|------|
| `GET` | `/api/review/:hostname` | 🔑 | Pobierz komentarze oceniania |
| `POST` | `/api/review/:hostname` | 🔑 | Dodaj komentarz nauczyciela |
| `DELETE` | `/api/review/:hostname/:index` | 🔑 | Usuń komentarz |

### AI & Analityka

| Metoda | Endpoint | Auth | Opis |
|--------|----------|:----:|------|
| `GET` | `/api/ai/status` | 🔑 | Status lokalnego LLM (Ollama) |
| `GET` | `/api/analytics/at-risk` | 🔑 | Lista uczniów zagrożonych |
| `GET` | `/api/analytics/summary` | 🔑 | Podsumowanie wyników + AI narracja |
| `POST` | `/api/analytics/generate-exam` | 🔑 | Generuj egzamin AI na słabe strony |

### Bezpieczeństwo

| Metoda | Endpoint | Auth | Opis |
|--------|----------|:----:|------|
| `POST` | `/api/ocr-scan` | 🔑 | Skanowanie zrzutu OCR |
| `POST` | `/api/network-lockdown/apply` | 🔑 | Włącz blokadę sieci na stacji |
| `POST` | `/api/network-lockdown/remove` | 🔑 | Wyłącz blokadę sieci |

### Marketplace

| Metoda | Endpoint | Auth | Opis |
|--------|----------|:----:|------|
| `GET` | `/api/marketplace` | 🔑 | Lista szablonów egzaminów |
| `POST` | `/api/marketplace` | 🔑 | Opublikuj szablon |
| `GET` | `/api/marketplace/:id/download` | 🔑 | Pobierz szablon |
| `DELETE` | `/api/marketplace/:id` | 🔑 | Usuń szablon (autor) |

---

## ⌨️ Skróty klawiszowe

### Panel nauczyciela

| Skrót | Akcja |
|-------|-------|
| `Ctrl + Enter` | ▶ Wypchnij zadanie do uczniów |
| `Ctrl + L` | 🔒 Zablokuj wszystkich uczniów |
| `Ctrl + B` | ⬛ Black screen dla wszystkich |
| `Ctrl + R` | ↻ Odśwież ranking |
| `Ctrl + 1` | Widok monitorowania |
| `Ctrl + 2` | Widok mapy klasy 3D |
| `Ctrl + 3` | Widok rankingu |
| `Esc` | Zamknij podgląd ekranu ucznia |

---

## 🗺️ Roadmap

Pełna lista z oznaczeniem co jest zaimplementowane: **[TODO.md](./TODO.md)**

<div align="center">

| Kategoria | Zaimplementowane | Planowane |
|-----------|:---:|:---:|
| 🏛️ Core Architecture & Backend | 12 | 0 |
| 🛡️ Anti-Cheat & Security | 6 | 1 |
| 🤖 AI & Documentation | 6 | 0 |
| 📊 Advanced Grading Engine | 9 | 0 |
| 🎨 UI/UX & Frontend | 9 | 0 |
| 🌐 Ecosystem & Integration | 5 | 1 |

**Zaimplementowane: 47/49 — gotowy do użycia produkcyjnego 🚀**

> Dwa nieukończone punkty wymagają infrastruktury poza zakresem codebase'u:
> sterownik kernela Windows (blokada task switch) oraz hosting SaaS w chmurze.

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=6264a7&height=120&section=footer&animation=fadeIn" width="100%"/>

<br/>

**Stworzone z ❤️ dla lepszej edukacji informatycznej**

<br/>

<img src="https://img.shields.io/badge/Made%20with-Node.js%20%2B%20❤️-6264a7?style=flat-square" alt="Made with"/>
&nbsp;
<img src="https://img.shields.io/badge/Dla%20szkół-technicznych%20PL-8b8dc7?style=flat-square" alt="Schools"/>

</div>

