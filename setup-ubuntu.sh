#!/bin/bash
set -e

# EduTrack Pro — Server Auto-Installer for Ubuntu 20.04+
# Version: 1.2.0

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   EduTrack Pro v1.2 — Auto-Installer  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# 1. Install Node.js 20
echo -e "${YELLOW}[1/5] Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential
else
    echo "  Node.js $(node -v) already installed."
fi

# 2. Install server dependencies
echo -e "${YELLOW}[2/5] Installing server dependencies...${NC}"
cd server
npm install
npx prisma generate
cd ..

# 3. Prepare directories
echo -e "${YELLOW}[3/5] Preparing data directories...${NC}"
mkdir -p server/test-data
chmod 755 server/test-data

# 4. Configure environment
echo -e "${YELLOW}[4/5] Configuring environment...${NC}"
if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
    echo -e "  ${GREEN}Created server/.env from .env.example${NC}"
    echo -e "  ${RED}⚠️  Edit server/.env and set JWT_SECRET, SESSION_SECRET, and DATABASE_URL!${NC}"
else
    echo "  server/.env already exists — skipping."
fi

# 5. Verify
echo -e "${YELLOW}[5/5] Verification...${NC}"
NODE_VER=$(node -v)
NPM_VER=$(npm -v)
echo -e "  ${GREEN}✓ Node.js: ${NODE_VER}${NC}"
echo -e "  ${GREEN}✓ npm: ${NPM_VER}${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "  Next steps:"
echo "  1. Start the database:    docker-compose up -d"
echo "  2. Edit configuration:    nano server/.env"
echo "  3. Run DB migrations:     cd server && npx prisma migrate deploy"
echo "  4. Start the server:      cd server && npm start"
echo ""
echo "  Teacher panel:  http://localhost:8080/login"
echo ""
