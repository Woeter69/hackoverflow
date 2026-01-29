# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-29

### Added
- **Hyperspace Transition:** Implemented a Star Wars-style lightspeed jump effect when confirming routes.
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
