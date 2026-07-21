# Acely 🎓

**The interview prep that kills the fear.** A free AI mock-interview & career-prep platform for students and freshers.

Practice unlimited AI mock interviews (text / voice / video), get kind, structured feedback, and watch your interview nerves *shrink* over time.

## Monorepo

```
preppal/
├─ frontend/   # Next.js 16 + TypeScript + Tailwind v4 (Vercel)
└─ backend/    # Spring Boot 4 + Java 21 + Postgres + JWT (Render/Railway)
```

## Tech
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS v4, Framer Motion, TanStack Query
- **Backend:** Spring Boot, Spring Data JPA, Spring Security + JWT, Flyway
- **DB:** PostgreSQL (Neon)
- **AI:** Google Gemini (question generation + answer scoring)
- **Voice/Video:** browser Web Speech + MediaRecorder — processed on-device, never uploaded

## Run locally

**Backend** (needs a Postgres URL + Gemini key in `backend/.env` — see `backend/.env.example`):
```bash
cd backend
./mvnw spring-boot:run
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

## Status
🚧 In active development — building the MVP: auth + dashboard + text mock interview.
