# 🌐 CampusLoop: The Living Digital Twin

**CampusLoop** is a hyper-immersive, 3D spatial platform designed to revolutionize campus logistics. By blending high-fidelity 3D visualization with advanced geospatial matching, it connects students in real-time for shared travel, peer-to-peer errands, and community safety.

![Theme](https://img.shields.io/badge/Aesthetic-Cyberpunk%20%2F%20Sci--Fi-00ffff?style=for-the-badge)
![Tech](https://img.shields.io/badge/Stack-Go%20%7C%20React%20%7C%20PostGIS-blue?style=for-the-badge)

---

## 🚀 Key Features

### 🏙️ 3D Holographic Interface
Move away from flat 2D maps. CampusLoop provides a high-fidelity **3D Digital Twin** of the campus layout using Three.js.
*   **Spatial Awareness:** See active requests and nodes exactly where they exist in the physical world.
*   **Neon Aesthetics:** A dark-mode, glassmorphism UI designed for high-density information display.

### 🧠 Smart Matching Engine (PostGIS)
Powered by a **Go** backend and **PostgreSQL/PostGIS**, our matching logic goes beyond simple proximity.
*   **Buffer Logic:** Matches are calculated along your *actual* planned route using `ST_DWithin` on `LineString` geometries.
*   **Route Intersection:** Finds tasks that fall within your path's influence zone, maximizing efficiency without adding travel time.

### 💬 Encrypted Comm-Link
Once a match is established, users enter a secure, real-time terminal-style chat.
*   **WebSocket Driven:** Instant, zero-latency coordination.
*   **Targeted Notifications:** The interface automatically opens the neural link for both parties upon message arrival.

### 💳 Neural Wallet & Reputation
Kindness is incentivized through a gamified reputation system.
*   **Cyber-Credits (CR):** Earn credits for completing missions.
*   **XP & Ranks:** Level up from 'Ghost' to 'Cyber Runner' as you build trust within the community.
*   **Lazy Registration:** Frictionless onboarding—your digital identity is created the moment you connect.

### 🛡️ SOS Beacon
Community safety is built into the core.
*   **Global Alert:** Triggering an SOS sends a real-time red pulse across the entire network.
*   **Visual Rally:** A massive red beam of light shoots up in the 3D world at the incident location, visible to every active user nearby.

---

## 🛠️ Technical Stack

- **Frontend:** React, Vite, Three.js, @react-three/fiber, Tailwind CSS.
- **Backend:** Go (Golang), Gin Framework, Gorilla WebSockets.
- **Database:** PostgreSQL + PostGIS (Spatial Data), Redis (Real-time state).
- **Auth:** Firebase Authentication.
- **Infrastructure:** Docker, Docker-Compose.

---

## 📦 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Woeter69/hackoverflow.git
    cd hackoverflow
    ```

2.  **Environment Setup:**
    Create a `.env` file based on `.env.example` and fill in your Firebase and Database credentials.

3.  **Launch with Docker:**
    ```bash
    make up
    ```
    This will spin up the 3D frontend (Port 3000), the Go backend (Port 8082), and the PostGIS-enabled database.

---

## 🛰️ Digital Architecture

CampusLoop is designed as a distributed system handling concurrent spatial queries and high-throughput WebSocket events. The backend utilizes Go's concurrency primitives to manage the WebSocket Hub and the matching engine efficiently.

*“Logistics is the skeleton of the campus; CampusLoop is the nervous system.”*
