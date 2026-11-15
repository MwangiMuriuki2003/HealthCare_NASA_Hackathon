# AstraVitals

AstraVitals is an offline-first crew health monitoring platform for deep-space missions. This repository contains the system design, application, backend services, and deployment assets for a mission-critical health dashboard built to operate during communication blackouts, delayed links, and intermittent connectivity.

This README is based on the system design captured in `AstraVitals_System_Design_PRD.pdf` and the current implementation in this repository.

## Why AstraVitals exists

Deep-space crews cannot rely on continuous Earth connectivity. During solar conjunction, network outages, or long latency windows, traditional health systems become unusable. AstraVitals keeps medical monitoring functional on-device by combining:

- local data capture for vital signs
- on-device interpretation and triage guidance
- encrypted local storage
- tamper-evident queued sync bundles for later transmission
- role-aware ground-side access controls

## Core capabilities

- Guided logging for six critical vitals:
  - heart rate
  - blood pressure (systolic and diastolic)
  - blood glucose
  - body temperature
  - sleep duration
- SVG body map and timeline-based health views
- Trend charts and trend-aware assessment logic
- Wellness scoring gauge and gamified achievement tracking
- Offline-first storage using local encryption
- DTN-style outbox workflow with signed bundle transmission
- FastAPI-based ground backend with RBAC and API-key validation

## System overview

The project is split into a desktop application and a ground backend:

- Frontend / client app: Electron + Next.js + React + TypeScript
- Local logic: encrypted IndexedDB storage, threshold rules, trend interpretation
- Backend service: Python + FastAPI + SQLAlchemy + PostgreSQL
- Infrastructure: Docker, Kubernetes manifests, and Terraform assets

## Architecture highlights

### Client / Crew interface

The app is designed to run as an offline mission tool for crew members and medics. It includes:

- a guided vitals logging form
- body-map annotations for symptoms or areas of concern
- charts for trend tracking over time
- score cards and interpretation states: GREEN, YELLOW, RED
- a gamification layer to encourage consistent logging behaviors

### Interpretation engine

AstraVitals evaluates each reading with a multi-stage assessment model:

1. threshold band classification
2. trend downgrade logic
3. combined-signal escalation
4. metric-specific clinical guidance

This allows the platform to issue actionable health feedback even without cloud-based analysis.

### Security model

The solution emphasizes resilient security for mission environments:

- AES-256-GCM encryption for local sensitive data
- non-extractable CryptoKey usage in browser storage
- separate device encryption keys from bundle signing keys
- Ed25519 signatures and SHA-256 hashing for synchronization bundles
- constant-time API key validation and RBAC enforcement on the ground backend

### Delay-tolerant synchronization

During blackout periods, the app bundles data into an outbox queue for delayed transmission when connectivity returns. This preserves mission continuity without requiring immediate Earth access.

## Repository structure

```text
AstraVitals_System_Design_PRD.pdf
astrovitals/
  app/                     # Next.js app and UI files
  src/                     # frontend components, hooks, lib, theme, types
  services/
    api/                   # FastAPI ground backend
  infra/
    docker/
    k8s/
    terraform/
  docs/
    project_summary.txt
    astrovitals_presentation.pdf
    project_summary.pdf
  prisma/
  e2e/
  public/
  Dockerfile
  docker-compose.yml
  package.json
  main.ts
  README.md
```

## Project stack

### Frontend

- Next.js 16
- React 19
- TypeScript 5
- Electron for desktop deployment
- Tailwind styling

### Backend

- Python 3.10+
- FastAPI
- SQLAlchemy async
- PostgreSQL
- Redis and Kafka-oriented messaging patterns

### Deployment and infrastructure

- Docker
- Docker Compose
- Kubernetes manifests
- Terraform modules

## Getting started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Python 3.10+
- Docker and Docker Compose
- PostgreSQL (if running outside Docker)

### Run the web app

```bash
cd astrovitals
npm install
npm run dev
```

Open http://localhost:3000 to view the application.

### Run Electron locally

```bash
cd astrovitals
npm install
npm run electron:dev
```

### Run the backend service

```bash
cd astrovitals/services/api
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

### Run the stack with Docker

```bash
cd astrovitals
docker compose up --build
```

## Environment variables

Common values used by the stack include:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `ASTRA_API_KEY`

The application is designed to be configured for both local development and mission-like deployments.

## Mission relevance

AstraVitals is not just a health dashboard; it represents a resilient design pattern for mission operations in environments where the network is unreliable or unavailable. It demonstrates how health monitoring can remain functional under deep-space constraints while preserving data integrity, user trust, and operational safety.

## Documentation and references

- `AstraVitals_System_Design_PRD.pdf`
- `astrovitals/docs/project_summary.txt`
- `astrovitals/docs/project_summary.pdf`
- `astrovitals/docs/astrovitals_presentation.pdf`

## Notes

This repository is a prototype and hackathon implementation focused on demonstrating a complete concept for offline-first crew health monitoring. It is intended to be adapted into a fuller mission-ready software stack as the design evolves.

## License

No explicit license file is included in this repository yet.

