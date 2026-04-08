<div align="center">

<!-- Animated header banner -->
<a href="https://meklasdev.github.io/EduTrack/" target="_blank">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=6264a7&height=200&section=header&text=EduTrack%20Pro&fontSize=56&fontColor=ffffff&fontAlignY=40&desc=Profesjonalny%20System%20Egzaminów%20Informatycznych&descAlignY=62&descSize=17&animation=fadeIn" width="100%"/>
</a>

<br/>

<!-- Badges row 1 -->
<img src="https://img.shields.io/badge/Wersja-1.2.0-6264a7?style=for-the-badge&logo=github&logoColor=white" alt="Version"/>
&nbsp;
<img src="https://img.shields.io/badge/Status-Production%20Ready-4ec994?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Status"/>
&nbsp;
<img src="https://img.shields.io/badge/Platform-Ubuntu%20%7C%20Windows-0078d4?style=for-the-badge&logo=linux&logoColor=white" alt="Platform"/>

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

<br/><br/>

<!-- Exams badges -->
<img src="https://img.shields.io/badge/Egzamin-INF.02-8b8dc7?style=flat-square" alt="INF.02"/>
&nbsp;
<img src="https://img.shields.io/badge/Egzamin-INF.03-8b8dc7?style=flat-square" alt="INF.03"/>
&nbsp;
<img src="https://img.shields.io/badge/Egzamin-INF.04-8b8dc7?style=flat-square" alt="INF.04"/>
&nbsp;
<img src="https://img.shields.io/badge/License-Proprietary-e05a6a?style=flat-square" alt="License"/>

<br/><br/>

<p><strong>EduTrack Pro</strong> to zaawansowany ekosystem do zarządzania egzaminami informatycznymi —<br/>
od automatycznego sprawdzania arkuszy Excel po monitoring antycheatowy w czasie rzeczywistym.</p>

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
| **Panel Nauczyciela** | Dashboard w stylu Microsoft Teams z monitoringiem RT |
| **AutoGrader** | Automatyczna ocena plików `.xlsx` — formuły, wartości, formatowanie |
| **Anti-Cheat Engine** | Wykrywanie AI, aplikacji i monitorowanie okien przez Windows API |
| **System Raportów** | PDF cheat evidence, certyfikaty, JSON exports, detekcja plagiatów |

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

### 🛡️ System Antycheatowy

- 🤖 Wykrywanie AI: ChatGPT, Claude, Gemini, DeepSeek, Ollama, Copilot
- 👁️ Monitoring okien przez Windows API (PowerShell + User32.dll)
- ⚠️ Alert przy alt-tab / opuszczeniu okna egzaminacyjnego
- 💬 Blokada komunikatorów: Discord, WhatsApp, Messenger, Telegram
- ⬛ Automatyczny **black-screen** po przekroczeniu 10 alertów
- 📄 Generator raportu "Cheat Evidence" PDF dla dyrektora / rodziców

### 📊 Panel Nauczyciela

- 🖼️ Miniatury ekranów uczniów w czasie rzeczywistym (co 3s)
- 🗺️ **Mapa klasy 3D** z wizualizacją biurek (perspektywa isometryczna)
- 🏆 **Ranking** z systemem punktów, kar za alerty i medalami
- 📬 Wiadomości bezpośrednie, zdalna blokada, black screen per uczeń
- ↺ **Reset alertów** ucznia (nowe!)
- 🏫 **Przypisanie ucznia do działu** (nowe!)
- 📊 Paski statystyk: aktywni uczniowie, łączne alerty, średni wynik
- ⌨️ 8 skrótów klawiszowych dla szybkiego działania

### 🔐 Autoryzacja i Wielodepartamentowość

- 🔑 System JWT + bcrypt dla nauczycieli
- 🏢 Rejestracja z przypisaniem do działu / przedmiotu
- 🔒 Izolacja danych: każdy nauczyciel widzi tylko swoich uczniów
- 🛡️ Rate limiting na endpointach mutujących dane (60 req/min)
- 🗄️ Redis-based session management

### 🤖 Silnik Oceniania — ExcelLogicChecker

- 🧮 Porównanie formuł (normalizacja, niezależna od spacji i `$`)
- ✅ Walidacja wartości z tolerancją zaokrąglenia (±0.01)
- 📝 Sprawdzanie formatowania (pogrubienie komórek)
- 🔄 Tryb **offline** (Excel lokalny) i **online** (wbudowany arkusz)
- 🕵️ Detekcja plagiatów: ≥90% zgodności = alert plagiat

---

## 🛠️ Stack technologiczny

| Warstwa | Technologia | Rola |
|---------|-------------|------|
| **Backend** | Node.js 20, Express.js | HTTP server, REST API |
| **Real-time** | Socket.io | WebSocket — monitoring RT |
| **Baza danych** | PostgreSQL + Prisma ORM | Persistent storage |
| **Cache / Sesje** | Redis | Session store, rate limiting |
| **Arkusze** | ExcelJS, jspreadsheet CE v4 | Grading engine, student UI |
| **PDF** | PDFKit | Raporty, certyfikaty |
| **Desktop** | Electron 28 | Student agent (Windows) |
| **Discovery** | Bonjour / mDNS | Auto-discovery w LAN |
| **Auth** | JWT, bcrypt | Bezpieczna autoryzacja |
| **Deploy** | Docker Compose | PostgreSQL + Redis stack |

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
│   │   ├── 📂 logic/            # ExcelLogicChecker — silnik oceniania
│   │   ├── 📂 middleware/       # JWT authMiddleware, rate limiter
│   │   └── 📂 routes/           # API routes (auth)
│   └── 📂 test-data/            # Szablony .xlsx do oceniania
│
├── 📂 app-student/              # Aplikacja Electron (Windows agent)
│   ├── main.js                  # Electron main process
│   ├── preload.js               # Context bridge (bezpieczne IPC)
│   └── 📂 ui/index.html         # UI terminala ucznia
│
├── 📂 docs/
│   └── index.html               # 🌐  Interaktywna strona projektu
│
├── docker-compose.yml           # PostgreSQL + Redis
├── setup-ubuntu.sh              # Auto-installer (Ubuntu)
├── TODO.md                      # ✅  Roadmap (100% ukończony)
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
```

---

## 📝 API Reference

> Endpointy oznaczone `🔑 auth` wymagają nagłówka `Authorization: Bearer <token>`.

| Metoda | Endpoint | Auth | Opis |
|--------|----------|:----:|------|
| `POST` | `/api/auth/register` | — | Rejestracja nauczyciela |
| `POST` | `/api/auth/login` | — | Logowanie — zwraca JWT |
| `GET` | `/api/students` | 🔑 | Lista uczniów w dziale |
| `POST` | `/api/check-excel` | — | Sprawdź arkusz ucznia |
| `POST` | `/api/upload-template` | 🔑 | Wgraj wzorzec oceniania `.xlsx` |
| `GET` | `/api/leaderboard` | — | Ranking uczniów |
| `GET` | `/api/report/:hostname` | 🔑 | Raport JSON ucznia |
| `GET` | `/api/report/:hostname/pdf` | 🔑 | Raport PDF (cheat evidence) |
| `GET` | `/api/certificate/:hostname` | 🔑 | Certyfikat ukończenia (PDF) |
| `POST` | `/api/detect-plagiarism` | 🔑 | Porównaj pliki uczniów |
| `POST` | `/api/students/:hostname/reset-alerts` | 🔑 | Resetuj alerty ucznia |
| `POST` | `/api/students/:hostname/assign-department` | 🔑 | Przypisz ucznia do działu |

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

Pełna lista ukończonych milestones: **[TODO.md](./TODO.md)**

<div align="center">

| Kategoria | Postęp |
|-----------|--------|
| 🏛️ Core Architecture & Backend | ✅ 12/12 |
| 🛡️ Anti-Cheat & Security | ✅ 8/8 |
| 🤖 AI & Documentation | ✅ 6/6 |
| 📊 Advanced Grading Engine | ✅ 10/10 |
| 🎨 UI/UX & Frontend | ✅ 9/9 |
| 🌐 Ecosystem & Integration | ✅ 7/7 |

**Łącznie: 52/52 zadań ukończonych — 100% ✅**

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

