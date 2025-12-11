# SoulLock Coordinator

A full-stack companion app that helps two trainers coordinate Pokémon Omega Ruby and Alpha Sapphire Soul Lock runs. Trainers can create dedicated rooms, invite their partners, and keep linked team progress synchronized in real time via WebSockets.

## Features

- **Instant room creation** with shareable invite links (trainers assign their versions inside the room)
- **Real-time synchronization** of trainer notes and party composition over WebSockets
- **Collaborative team management** with per-Pokémon status tracking
- **Persistent room storage** in MongoDB Atlas with automatic cleanup of idle sockets

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (ships with Node.js)

## Installation

Install dependencies for both the frontend and backend:

```powershell
npm --prefix client install
npm --prefix server install
```

## Development

Run the frontend and backend side by side:

```powershell
npm --prefix server run dev      # starts nodemon on http://localhost:4000
npm --prefix client run dev -- --host  # starts Vite dev server on http://localhost:5173
```

The repository also defines VS Code tasks named `frontend: dev server` and `backend: dev server` to launch the same commands.

Prefer a single command? Use the helper script (installs dependencies on first run):

```powershell
.\scripts\run-dev.ps1       # add -ForceInstall to reinstall dependencies
```

## Configuration

Copy `server/.env.example` to `server/.env` (or set environment variables another way) and update the MongoDB credentials if needed:

```
MONGODB_URI=mongodb+srv://ddmann2004_db_user:<db_password>@soullock.bvtsaaf.mongodb.net/?appName=soullock
MONGODB_DB_NAME=soullock
PORT=4000
```

## Production Builds

Build the React frontend:

```powershell
npm --prefix client run build
```

The backend is a Node.js server (no build step required). Deploy the `server` directory to your Node runtime of choice.

## API Overview

### REST Endpoints

- `POST /rooms` — Create a new room (no body required).
- `GET /rooms/:roomId` — Fetch metadata for an existing room.
- `GET /health` — Health probe for liveness checks.

### WebSocket Channel

- Connect to `ws://<server>/ws?roomId=<id>`
- Messages:
  - Server → Client `init` — Initial room payload including current state
  - Client → Server `sync_state` — Submit the full room state after local edits
  - Server → Client `state_updated` — Broadcasts state changes from peers
  - Ping/pong keepalive support (`ping` / `pong`)

State payloads contain each trainer's selected game (if chosen), their notes, and per-Pokémon metadata.

## Project Structure

```
client/   # Vite + React frontend
server/   # Express + ws backend
.vscode/  # VS Code tasks for development servers
```

## Next Steps

- Add additional game support and per-encounter tracking.
- Implement authentication and finer access controls if needed.
