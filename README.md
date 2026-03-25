# OfficeStream

Real-time office communication platform — like Microsoft Teams, built from scratch.

Video conferencing, server-side recording, direct messaging, knock-to-call, screen sharing, and office management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Express 5, TypeScript, Mongoose, Socket.IO |
| Video/Audio | LiveKit (WebRTC SFU) |
| Recording | LiveKit Egress (server-side MP4) |
| Database | MongoDB (auto-embedded in dev via mongodb-memory-server) |
| Infrastructure | Docker Compose (LiveKit Server + Egress + Redis) |

## Prerequisites

You need these installed before running:

- **[Node.js](https://nodejs.org)** v20 or higher
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (must be running)

## Quick Start

```bash
# 1. Clone
git clone https://github.com/theadvaithsonne/OfficeStream.git
cd OfficeStream

# 2. Install (auto-installs all sub-packages + creates .env files)
npm install

# 3. Seed admin user (optional but recommended)
npm run seed

# 4. Start everything (Docker + Server + Web)
npm run dev

# 5. Open in browser
# http://localhost:3000
```

> **Important:** Make sure Docker Desktop is running before `npm run dev`. The command starts LiveKit, Egress, and Redis containers automatically via `docker compose up`.

## Default Login

After running `npm run seed`:

- **Email:** admin@officestream.com
- **Password:** admin123
- **Office:** OfficeStream HQ

## What `npm install` Does

The postinstall script automatically:
1. Installs `apps/server/` dependencies
2. Installs `apps/web/` dependencies
3. Copies `.env.example` → `.env` (server) if not present
4. Creates `.env.local` (web) with defaults if not present
5. Creates the `recordings/` directory
6. Checks if Docker is installed (warns if not)

## What `npm run dev` Starts

| Service | Port | Description |
|---------|------|-------------|
| Docker Compose | — | Starts Redis, LiveKit Server, LiveKit Egress |
| LiveKit Server | 7880 | WebRTC SFU for video/audio |
| Redis | 6379 | Message bus (LiveKit ↔ Egress) |
| Express Server | 5000 | REST API + Socket.IO |
| Next.js | 3000 | Frontend |

## API Documentation (Swagger)

Once running, open **http://localhost:5000/api-docs** for interactive API docs.

To test protected endpoints:
1. Use **POST /api/auth/login** to get an access token
2. Click the **Authorize** button (top right)
3. Paste the token and click Authorize

## Features

- User registration & login (email/password + Google OAuth)
- JWT auth with refresh token rotation (15min access / 7day refresh)
- Create offices, invite members via code
- Real-time video/audio calls (WebRTC via LiveKit)
- Knock-to-call (ring a colleague)
- Screen sharing
- Server-side recording (LiveKit Egress → MP4)
- Direct messaging with real-time delivery
- Online/Away/Busy/Offline presence
- Notification system
- Role management (owner/admin/member)

## Project Structure

```
officestream/
├── package.json              # Root scripts (dev, build, seed)
├── docker-compose.yml        # LiveKit + Egress + Redis
├── scripts/setup.js          # Post-install setup
├── livekit/
│   ├── livekit.yaml          # LiveKit server config
│   └── egress.yaml           # Egress service config
├── apps/
│   ├── server/               # Express backend (TypeScript)
│   │   ├── src/
│   │   │   ├── controllers/  # Route handlers
│   │   │   ├── models/       # Mongoose schemas
│   │   │   ├── routes/       # API routes
│   │   │   ├── socket/       # Socket.IO events
│   │   │   └── lib/          # Utils (db, livekit, auth, swagger)
│   │   └── .env.example      # Environment template
│   └── web/                  # Next.js 16 frontend (TypeScript)
│       ├── app/              # App Router pages
│       ├── components/       # React components
│       ├── context/          # Auth + Socket providers
│       └── hooks/            # Custom hooks
└── DOCUMENTATION.pdf         # Full technical documentation
```

## Documentation

See **[DOCUMENTATION.pdf](DOCUMENTATION.pdf)** for complete technical docs including:
- All dependencies with versions
- Architecture diagrams
- Detailed feature flows (component → API → controller → database)
- Data storage explanations
- Recording system internals
- Security model (JWT, bcrypt, refresh token rotation)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `docker compose` fails | Make sure Docker Desktop is running |
| Port 7880 already in use | Stop any local LiveKit server: `taskkill /f /im livekit-server.exe` |
| MongoDB connection error | The app auto-starts an embedded MongoDB — no install needed |
| 401 on API calls | Your access token expired (15min). Login again or let the auto-refresh handle it. |
| Recording fails with "room does not exist" | You can only record a room that has active participants in a call |

## License

MIT
