# FinCore Development Guide

## Running the Project

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Both run simultaneously (ports 8000 and 3000).

## Verification

- Backend health: `GET http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`
- Frontend lint: `npm run lint` (in frontend dir)

## Environment Setup

1. Backend: Copy `backend/.env.example` → `backend/.env`
2. Frontend: Already configured with `.env.local`
3. Database: Auto-created at `backend/fin_core.db`

## Structure

- **Backend**: FastAPI + SQLite (aiosqlite)
  - Entry: `backend/main.py`
  - Routes: `backend/routes/*.py`
  - Models: `backend/models/*.py`
- **Frontend**: Next.js 15 + React 19
  - Entry: `frontend/app/page.tsx`
  - Pages: `frontend/app/projection/page.tsx`