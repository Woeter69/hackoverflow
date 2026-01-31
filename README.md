# CampusLoop: The Living Hologram

**CampusLoop** is a next-generation campus ecosystem designed as a "Living Hologram"—an immersive, 3D digital twin of the university environment. Built for Hackoverflow 2026, it merges high-performance spatial matching with a polished, sci-fi aesthetic to connect students for travel-sharing and errand-running.

## 🌌 Project Philosophy
- **Digital Twin**: Real-time 3D visualization of campus state.
- **Sci-Fi Aesthetic**: Dark mode, Neon (Bloom) effects, Glassmorphism, and a "JARVIS-vibe" terminal interface.
- **Precision Matching**: Leveraging PostGIS for buffer-based route matching rather than simple distance.

---

## 🛠 Tech Stack

### Backend
- **Language**: Go (Gin Framework)
- **Database**: **PostgreSQL + PostGIS** (Spatial indexing for route matching)
- **Real-time**: **Redis** for WebSocket state management and live event broadcasting.
- **Auth & Storage**: **Firebase** (Secure authentication and user profile storage).
- **Live Reload**: Air for hot-reloading Go development.

### Frontend
- **Framework**: React (Vite) + TypeScript.
- **3D Engine**: **Three.js** (@react-three/fiber + @react-three/drei).
- **Styling**: Tailwind CSS + Framer Motion (Glassmorphism & Neon Bloom).
- **State**: WebSockets for real-time SOS beacons and matching updates.

---

## 🏗 Repository Structure

```text
.
├── main.go                 # Backend entry point
├── internal/
│   ├── database/           # Postgres (GORM), PostGIS & Redis initialization
│   ├── handlers/           # API Logic (Matching, CRUD, Auth)
│   ├── models/             # Database schemas & JSON structs
│   ├── middleware/         # JWT & Auth interceptors
│   └── websocket/          # Real-time Hub & Client management
├── frontend/
│   ├── src/
│   │   ├── components/     # 3D Hologram, SOS Beacons, HUD elements
│   │   ├── lib/            # Firebase config, API clients, WS hooks
│   │   └── pages/          # Landing Page, Auth, Dashboard
│   └── vite.config.ts
├── schema.sql              # Database migrations (PostGIS enabled)
├── docker-compose.yml      # Full-stack orchestration (Go, PG, Redis)
└── Makefile                # Shortcuts for dev, build, and cleanup
```

---

## 🛰 Core Systems

### 1. Smart Matching (PostGIS)
Unlike simple Euclidean distance, CampusLoop uses `ST_DWithin` on `LineString` routes. When a user posts a travel plan, the system creates a spatial buffer around their route to find errands or peers that fall within their actual path.

### 2. The Real-time Hub (Redis & WebSockets)
Redis acts as the backbone for our WebSocket service, ensuring that SOS beacons, comm-link messages, and match notifications are delivered instantly across the campus grid.

### 3. Neural Identity (Firebase)
We utilize Firebase for decentralized authentication, ensuring student data is secure while providing a seamless login experience for the "Neural Wallet" HUD.

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Go 1.22+ (for local development)
- Node.js 20+

### Installation
1. Clone the repository.
2. Setup your `.env` file (see `.env.example`).
3. Launch the grid:
   ```bash
   make up
   ```
4. Access the Hologram:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8082`

---



Built for **Hackoverflow 2026**. Managed by **Woeter69**.
