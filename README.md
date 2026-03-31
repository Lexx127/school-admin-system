# Agape College School Administration System

Monorepo with a FastAPI backend and Next.js frontend.

## Local Development

### 1) Backend

1. Create `.env` in `backend/` with:
   - `DATABASE_URL=<your database connection string>`
   - `CORS_ORIGINS=http://localhost:3000`
   - `COOKIE_SECURE=false`
   - `COOKIE_SAMESITE=lax`
2. Start API:
   - `uvicorn main:app --reload --host 0.0.0.0 --port 8000` (run in `backend/`)

### 2) Frontend

1. Create `.env.local` in `frontend/`:
   - `NEXT_PUBLIC_API_URL=http://localhost:8000`
2. Install and run:
   - `npm install`
   - `npm run dev`

## Production Notes

- Set `COOKIE_SECURE=true` behind HTTPS.
- Set `CORS_ORIGINS` to your frontend origin(s), comma-separated.
- Set `NEXT_PUBLIC_API_URL` to the deployed API URL.
- Validate auth cookies and CORS in staging before go-live.
