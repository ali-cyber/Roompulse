# RoomPulse (packaged)

Mobile-first web app for anonymous realtime room feedback (music, temperature, reading mode).

## Local run (easiest)

1) Start Postgres
```bash
docker compose up -d
```

2) Install dependencies
```bash
npm install
```

3) Create env file
```bash
cp .env.example .env.local
```

4) Run
```bash
npm run dev
```

Open http://localhost:3000

## Railway deploy (non-technical)

1) Upload this repo to GitHub
2) In Railway: New Project → Deploy from GitHub
3) Add PostgreSQL (Railway plugin)
4) In your app service Variables, set:
- DATABASE_URL (from the Postgres service)
- NEXT_PUBLIC_BASE_URL (your Railway public URL)
- NEXT_PUBLIC_WS_URL (same as Base URL)

Then deploy.

## Notes
- Anonymous: only stores timestamp + category + value + random clientHash (localStorage). No usernames. No IP addresses stored.
- Rate limit: 1 submission per category per device per 60 seconds (configurable via COOLDOWN_SECONDS).
