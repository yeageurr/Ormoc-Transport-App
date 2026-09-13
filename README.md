# Ormoc Transport App

A real-time PUV/multicab dispatch, tracking, and administration system for Ormoc City, Leyte. It includes a FastAPI/PostgreSQL backend, React admin web app, Expo mobile apps, and ETA utilities.

## Project structure

| Directory | Purpose |
| --- | --- |
| `backend/` | FastAPI API, PostgreSQL models, Alembic migrations, seeds, and tests |
| `web_ui/web/` | React + Vite admin dashboard |
| `mobile/driver-app/` | Expo/React Native driver app |
| `mobile/commuter-app/` | Expo/React Native commuter app |
| `ai_ml/` | ETA model utilities |
| `UIs/` | UI reference images |

## Tools and libraries

### Backend

- Python 3.11+, FastAPI, and Uvicorn
- SQLAlchemy, psycopg2-binary, and PostgreSQL
- Alembic migrations
- Pydantic and pydantic-settings
- python-jose, passlib, and bcrypt for JWT authentication and password hashing
- python-dotenv, WebSockets, httpx, and OSRM route-distance integration

Exact versions are in [backend/requirements.txt](backend/requirements.txt).

### Admin web app

- React 19, React Router, and Vite
- Tailwind CSS, PostCSS, and Autoprefixer
- Axios, Leaflet, React Leaflet, Lucide React, and Recharts
- ESLint

Exact versions are locked in [web_ui/web/package-lock.json](web_ui/web/package-lock.json). Use `lucide-react@1.38.0` for compatibility.

### Mobile apps

- Expo 57, React Native 0.86, and React 19
- Expo Router, Expo Location, and Expo Secure Store
- React Native Gesture Handler, Reanimated, Safe Area Context, and Screens
- TypeScript and Axios

## Prerequisites

Install Git, Python 3.11+, Node.js 20 LTS+ (includes npm), and PostgreSQL 14+. For device testing, install Expo Go or set up an Android/iOS simulator.

## First-time setup

### 1. Clone

```bash
git clone <repository-url>
cd Ormoc-Transport-App
```

### 2. Backend, virtual environment, and database

```bash
cd backend
python3 -m venv .venv

# macOS/Linux (bash or zsh)
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Copy the safe environment template, then edit `backend/.env` with your PostgreSQL connection, a secure `SECRET_KEY`, and non-default admin credentials:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Example local database URL:

```dotenv
DATABASE_URL=postgresql+psycopg2://postgres:your-password@localhost:5432/ormoc_transport
```

Create the database in PostgreSQL, then apply migrations and seed initial data:

```bash
alembic upgrade head
python -m seed.seed4dmin
python -m seed.seed_routes
```

Run the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Check <http://localhost:8000/health> and use <http://localhost:8000/docs> for API documentation.

### 3. Admin web app

Open a second terminal:

```bash
cd web_ui/web
npm ci
npm run dev
```

Vite usually runs at <http://localhost:5173>. It uses `http://localhost:8000` unless `VITE_API_BASE_URL` is configured in `web_ui/.env`.

```bash
npm run build
npm run lint
```

### 4. Driver mobile app

```bash
cd mobile/driver-app
npm ci
npm start
```

Use the Expo controls to launch Android, iOS, web, or scan the QR code with Expo Go. A physical device must use your computer's LAN IP for the API instead of `localhost`.

### 5. Commuter mobile app

```bash
cd mobile/commuter-app
npm ci
npm start
```

## Common commands

| Area | Command | Purpose |
| --- | --- | --- |
| Backend | `alembic upgrade head` | Apply migrations |
| Backend | `python -m seed.seed4dmin` | Create initial admin |
| Backend | `python -m seed.seed_routes` | Seed terminal and pilot routes |
| Backend | `uvicorn app.main:app --reload` | Run API |
| Web | `npm run dev` | Run admin app |
| Web | `npm run build` | Production build |
| Driver | `npm start` | Run Expo |
| Driver | `npx tsc --noEmit` | Type-check |

## Security and configuration

- Never commit `backend/.env`, database passwords, or tokens.
- Change the seed-admin password before deployment.
- Run `alembic upgrade head` after pulling migrations.
- Pilot route coordinates and fallback distances in `backend/seed/seed_routes.py` must be verified before production.
