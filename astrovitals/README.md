# AstraVitals

AstraVitals is an offline-first crew health monitoring system designed for deep-space missions. The app is built to operate without continuous Earth connectivity and to provide clinically meaningful feedback to crew members even during communication blackouts.

This project is based on the system design captured in `AstraVitals_System_Design_PRD.pdf` and the current implementation in this repository.

## What the system does

The platform monitors six core vital signs:

- heart rate
- systolic and diastolic blood pressure
- blood glucose
- body temperature
- sleep duration

It combines data entry, trend analysis, clinical interpretation, and gamified engagement to help crew members maintain health awareness across long-duration missions.

## Key features

- Offline-first operation for blackout conditions
- Local encrypted storage using AES-256-GCM
- Guided vitals logging workflow
- Body-map visualizations and health timeline views
- Trend evaluation and personalized interpretation states
- Achievement system to promote regular logging
- DTN outbox queue for delayed transmission of signed medical bundles
- Role-aware backend access controls for Earth-side operations

## Tech stack

- Frontend: Next.js, React, TypeScript, Electron
- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Security: local encryption, signed bundles, API-key enforcement, RBAC
- Deployment: Docker, Kubernetes, Terraform

## Project structure

```text
astrovitals/
  src/
  services/
  infra/
  docs/
  prisma/
  e2e/
  public/
  Dockerfile
  docker-compose.yml
  package.json
  README.md
```

## Run locally

```bash
cd astrovitals
npm install
npm run dev
```

For Electron:

```bash
npm run electron:dev
```

For Docker:

```bash
docker compose up --build
```

## Mission relevance

AstraVitals demonstrates a resilient, mission-critical design for deep-space operations where terrestrial connectivity cannot be assumed. It focuses on local autonomy, secure data handling, and medically grounded interpretation so crew health monitoring remains effective under extreme conditions.

## References

- `AstraVitals_System_Design_PRD.pdf`
- `docs/project_summary.txt`
- `docs/project_summary.pdf`

