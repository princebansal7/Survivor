# Survivor

A real-time Survivor-style game web app. Players compete in rounds, vote to eliminate others, and the last one standing wins.

**Stack:** FastAPI (backend) + Next.js 14 (frontend) + PostgreSQL + Docker

---

## Quick Start

### Option A — Full Stack in Docker (recommended)

```bash
docker compose --profile full up --build

# To remove (data will persist)
docker compose --profile full down
```

- Database: `postgres://survivor_user:password@localhost:5432/survivor_db`
- Backend API: http://localhost:8000
- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

---

### Option B — Database in Docker, Apps Natively

```bash
# 1. Start only the database
docker compose up -d

# To remove only the DB (data will persist)
docker compose down

# 2. Set up the backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — set DATABASE_URL if needed:
# postgresql://survivor_user:password@localhost:5432/survivor_db
uvicorn app.main:app --reload

# 3. Set up the frontend (in a new terminal)
cd frontend
npm install
npm run dev
```

---

## Admin Account

**There are no preset admin credentials.**

The **first person to register** on a fresh database becomes the admin automatically.

```python
# backend/app/routers/auth.py — lines 19, 24–25
is_first_user = db.query(User).count() == 0
role=UserRole.admin if is_first_user else UserRole.player,
status=UserStatus.approved if is_first_user else UserStatus.pending,
```

| User # | Role   | Status    | Notes                                      |
|--------|--------|-----------|--------------------------------------------|
| 1st    | admin  | approved  | Full access — no approval needed           |
| 2nd+   | player | pending   | Must be approved by admin in `/admin` panel |

### To become admin on a fresh install

1. Start the app and go to http://localhost:3000/register
2. Register with any username, email, and password
3. You are immediately logged in as admin
4. Subsequent users must be approved via the Admin panel


## Tech Stack

| Layer     | Technology           |
|-----------|----------------------|
| Backend   | FastAPI + SQLAlchemy |
| Frontend  | Next.js 14 + React   |
| Database  | PostgreSQL 16        |
| Auth      | JWT (python-jose)    |
| Passwords | bcrypt via passlib   |
| Styling   | Tailwind CSS         |

---

## Key URLs

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:8000      |
| API docs | http://localhost:8000/docs |
| Admin    | http://localhost:3000/admin|