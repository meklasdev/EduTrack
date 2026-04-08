<p align="center">
  <img src="logo.svg" width="160" alt="EduTrack Logo">
</p>

<h1 align="center">EduTrack Pro v1.2</h1>

<p align="center">
  <strong>Profesjonalny system zarządzania salą informatyczną i automatycznego sprawdzania egzaminów</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.2.0-6264a7?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Ubuntu%20%7C%20Windows-green?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Stack-Node.js%20%7C%20PostgreSQL%20%7C%20Redis-blue?style=flat-square" alt="Stack">
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat-square" alt="License">
</p>

---

## 🌟 Opis

**EduTrack Pro** to zaawansowany ekosystem dla nauczycieli informatyki i administratorów szkół technicznych. Łączy w sobie:

- **Terminal ucznia** — przeglądarkowy lub desktopowy (Electron) interfejs do egzaminów z arkuszami kalkulacyjnymi
- **Panel nauczyciela** — dashboard w stylu Microsoft Teams z monitoringiem w czasie rzeczywistym
- **Silnik sprawdzania** — automatyczna ocena plików `.xlsx` z walidacją formuł, wartości i formatowania
- **System antycheatowy** — wykrywanie zabronionych aplikacji (AI, komunikatory, przeglądarki), śledzenie okien

---

## 🚀 Funkcje

### 🖥️ Terminal Ucznia (Web + Electron)
- Wbudowany arkusz kalkulacyjny (`jspreadsheet CE v4`) z pełnym wsparciem formuł
- Oczekiwanie na zadanie z animowanym ekranem startowym
- **Timer egzaminacyjny** — odmierzanie czasu od startu zadania
- Asystent pomocy z przeszukiwalną bazą formuł Excel, SQL, INF.02/03, C++
- Animowany pasek wyniku po sprawdzeniu
- Toast notifications zamiast okienek `alert()`

### 🛡️ System Antycheatowy
- Wykrywanie AI: ChatGPT, Claude, Gemini, DeepSeek, Ollama, Copilot
- Monitoring okien przez Windows API (PowerShell + User32)
- Alert przy alt-tab / opuszczeniu okna egzaminacyjnego
- Blokada komunikatorów: Discord, WhatsApp, Messenger, Telegram
- Automatyczny black-screen po przekroczeniu 10 alertów

### 📊 Panel Nauczyciela
- Widok monitoringu z miniaturami ekranów studentów w czasie rzeczywistym
- **Toast notifications** — alerty, połączenia, wyniki bez okienek `alert()`
- **Wskaźnik aktywnego zadania** w nagłówku z pulsującym znacznikiem
- **Wskaźnik połączenia** z serwerem w nagłówku
- **Pusta plansza** z informacją gdy nie ma połączonych uczniów
- Mapa klasy z wizualizacją biurek
- Ranking (leaderboard) z systemem punktowym i karami za alerty
- Zdalna blokada, black screen i wiadomości bezpośrednie
- Generowanie raportów PDF i certyfikatów ukończenia
- Detekcja plagiatów między pracami uczniów

### 🔐 Autoryzacja i Wielodepartamentowość
- System JWT + bcrypt dla nauczycieli
- Rejestracja z przypisaniem do działu/przedmiotu
- Izolacja danych: każdy nauczyciel widzi tylko swoich uczniów
- Redis-based session management

### 🤖 Silnik Oceniania (ExcelLogicChecker)
- Porównanie formuł (normalizacja, bez względu na spacje i `$`)
- Walidacja wartości z tolerancją na zaokrąglenie (±0.01)
- Sprawdzanie formatowania (pogrubienie)
- Tryb offline (Excel lokalny) i online (wbudowany arkusz)

---

## 🛠️ Stack Technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Backend | Node.js, Express, Socket.io |
| Baza danych | PostgreSQL (Prisma ORM) |
| Cache / Sesje | Redis |
| Arkusze | ExcelJS, jspreadsheet CE v4 |
| PDF | PDFKit |
| Desktop | Electron |
| Discovery | Bonjour/mDNS |

---

## 💻 Instalacja

### Wymagania
- Ubuntu 20.04+ lub Windows 10+
- Node.js 20+
- Docker (dla PostgreSQL i Redis)

### Serwer (Ubuntu)

```bash
# 1. Sklonuj repozytorium
git clone <repo-url> && cd EduTrack

# 2. Uruchom automatyczny skrypt instalacji
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh

# 3. Uruchom bazy danych
docker-compose up -d

# 4. Skonfiguruj środowisko
cd server
cp .env.example .env
# Edytuj .env: ustaw DATABASE_URL, JWT_SECRET, SESSION_SECRET

# 5. Zainicjalizuj bazę danych
npx prisma migrate deploy

# 6. Uruchom serwer
npm start
```

Panel nauczyciela dostępny pod: `http://localhost:8080/login`

### Terminal Ucznia (Electron)

```bash
cd app-student
npm install
npm start
```

Aplikacja automatycznie wykrywa serwer EduTrack w sieci LAN przez Bonjour/mDNS.

---

## 🔐 Konfiguracja (`server/.env`)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/edutrack?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="twoj-tajny-klucz-jwt"
SESSION_SECRET="twoj-tajny-klucz-sesji"
NODE_ENV="production"
PORT=8080
```

---

## 📁 Struktura Projektu

```
EduTrack/
├── server/                  # Backend Node.js
│   ├── index.js             # Serwer główny
│   ├── prisma/              # Schema i migracje bazy danych
│   ├── public/              # Frontend (admin, login, student-web)
│   │   ├── admin.html       # Panel nauczyciela
│   │   ├── login.html       # Strona logowania
│   │   └── index.html       # Terminal ucznia (przeglądarka)
│   ├── src/
│   │   ├── logic/           # ExcelLogicChecker
│   │   ├── middleware/       # JWT auth middleware
│   │   └── routes/          # API routes (auth)
│   └── test-data/           # Szablony xlsx do oceniania
├── app-student/             # Aplikacja Electron (terminal ucznia)
│   ├── main.js              # Electron main process
│   ├── preload.js           # Context bridge
│   └── ui/index.html        # UI terminala
├── docker-compose.yml       # PostgreSQL + Redis
└── setup-ubuntu.sh          # Auto-installer
```

---

## 📝 API Endpoints

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/auth/register` | Rejestracja nauczyciela |
| POST | `/api/auth/login` | Logowanie |
| GET | `/api/students` | Lista uczniów (auth) |
| POST | `/api/check-excel` | Sprawdź arkusz ucznia |
| POST | `/api/upload-template` | Wgraj wzorzec oceniania (auth) |
| GET | `/api/leaderboard` | Ranking uczniów |
| GET | `/api/report/:hostname` | Raport JSON ucznia (auth) |
| GET | `/api/report/:hostname/pdf` | Raport PDF ucznia (auth) |
| GET | `/api/certificate/:hostname` | Certyfikat ukończenia (auth) |
| POST | `/api/detect-plagiarism` | Porównaj pliki uczniów (auth) |
| POST | `/api/students/:hostname/reset-alerts` | Resetuj alerty ucznia (auth) |
| POST | `/api/students/:hostname/assign-department` | Przypisz ucznia do działu nauczyciela (auth) |

---

<p align="center">
  Stworzone z ❤️ dla lepszej edukacji
</p>
