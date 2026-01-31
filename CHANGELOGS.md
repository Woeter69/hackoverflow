# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-31

### Added
- **Mission Ownership Context:** Requesters can now see their own missions highlighted in Mission Control and open chat channels even before a runner accepts.
- **Lazy Registration:** `GetUserProfile` now automatically creates a default profile for first-time users (and dev users), fixing "Profile fetch failed" errors.
- **Targeted Chat Notifications:** Implemented `SendToUser` in WebSocket Hub to notify specific recipients of incoming messages, ensuring the chat tab opens for both parties.
- **Errand Runners:** Added `runner_id` to `errand_requests` to track who is fulfilling a mission and ensure credits are awarded correctly.

### Fixed
- **Action Permissions:** Restricted "Complete" mission action strictly to the assigned runner to ensure fair credit distribution.
- **Auth Stability:** Refactored React lifecycle hooks to separate authentication tracking from user-dependent side effects, ensuring stable login state management.
- **Environment Configuration:** Resolved an issue where the backend was incorrectly connecting to a remote Render database instead of the local Docker database, ensuring consistent schema application.
- **Connection Resiliency:** Improved WebSocket and Vite proxy handling to gracefully manage backend startup delays, resolving persistent `ECONNREFUSED` errors during initial boot.
- **Database Schema:** Manually synchronized the database with `schema.sql`, resolving missing columns (`credits`, `xp`) and missing tables (`messages`).
- **Credit Logic:** Fixed a bug where credits and XP were not being awarded after completing an errand.
- **Backend Build:** Implemented missing `ToggleEmergency` and `GetUserProfile` handlers to fix compilation errors.
- **Chat Stability:** Improved `SendMessage` with safer UUID parsing, context-based user IDs, and enhanced error logging to resolve 500 errors.
- **Vite Proxy:** Fixed `ECONNREFUSED` by resolving backend crashes caused by database inconsistencies.

## [Unreleased] - 2026-01-30

### Fixed
- **Frontend Build:** Resolved multiple TypeScript errors in `CampusHologram.tsx` and `Hyperspace.tsx`.
- **MatchList Component:** Re-implemented the missing `MatchList` component to display matched errands along the route.
- **Database Resiliency:** Added retry logic and 30-second timeout to backend DB connection for improved cloud startup reliability.
- **Docker Production:** Removed `.env` file requirement in `Dockerfile` to support CI/CD build environments.
- **API Typing:** Added missing `MatchResponse` and `Point` interfaces to frontend API library.

## [Unreleased] - 2026-01-29

### Added
- **Cyber-Credit System:** Users now earn credits and XP for completing errands.
- **Neural Wallet HUD:** A sleek glassmorphism overlay showing real-time balance, level, and rank.
- **Encrypted Comm-Link:** Real-time terminal-style chat for every errand request.
- **Terminal UI:** Hacker-style chat window with secure channel visualization.
- **Profile API:** New backend endpoint to fetch user stats and reputation level.
- **Rankings:** Initialized users with ranks (e.g., Ghost -> Cyber Runner) based on XP.
- **SOS Beacon:** Added a massive, pulsing red beam visualization for emergency alerts (Building 7).
- **Glassmorphism Sidebar:** Created a "Mission Control" sidebar displaying:
    - Real-time System Status (Network, Alert Level).
    - Live feed of active errand requests.
    - Hacker-style terminal output.
- **Route Visualization:** Added a glowing green path connecting start and destination buildings in the 3D hologram.
- **Backend Fixes:** 
    - Resolved `null` JSON response bug in `GetPendingErrands`.
    - Fixed Docker port mapping issue (8082 vs 8080).
    - Disabled VCS stamping in `air` build to fix Docker dev environment errors.

### Changed
- Refactored `CampusHologram.tsx` to support distinct modes (Travel vs. Errand) with dedicated overlays.
- Updated `docker-compose.yml` to explicitly set `PORT=8082` for the backend.

### Fixed
- Fixed WebSocket coordinate mapping between frontend (local range) and backend (PostGIS geography).
