<div align="center">
  <img src="https://img.shields.io/badge/AstraVitals-Deep%20Space%20Health%20Monitor-0B1026?style=for-the-badge&logo=rocket&logoColor=white" alt="AstraVitals" />
  <br />
  <img src="https://img.shields.io/badge/TypeScript-67.5%25-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-24.8%25-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Cloud-Network%20Resilient-0EA5E9?style=flat-square" alt="Network resilient" />
  <img src="https://img.shields.io/badge/Status-Mission%20Ready%20Prototype-22C55E?style=flat-square" alt="Mission ready prototype" />
</div>

# 🚀 AstraVitals

AstraVitals is an offline-first crew health monitoring platform built for deep-space missions, where communication blackouts, delayed links, and intermittent connectivity can make traditional medical systems unreliable or unusable.

This repository contains the system concept, application implementation, backend services, infrastructure templates, and supporting documentation behind the AstraVitals mission health platform.

> “Health continuity when Earth is out of reach.”

## ✨ Why AstraVitals matters

During solar conjunctions, deep-space transit, or communication gaps, terrestrial health systems assume constant connectivity. AstraVitals keeps crew health monitoring alive on-device by combining:

- local vital-sign collection
- encrypted storage
- on-device clinical interpretation
- trend-aware health scoring
- tamper-evident delayed sync for Earth return

## 🩺 What the system monitors

The platform tracks six critical vital signs:

- Heart rate
- Blood pressure (systolic + diastolic)
- Blood glucose
- Body temperature
- Sleep duration

It presents readings through a guided logging workflow, body-map views, charts, score cards, and achievement tracking to encourage consistent health monitoring.

## 🏗️ Architecture at a glance

| Layer | Stack | Purpose |
| --- | --- | --- |
| Client app | Next.js + React + TypeScript + Electron | Crew-facing desktop experience |
| Local logic | IndexedDB, encryption, interpretation engine | Secure offline health analysis |
| Backend | FastAPI + SQLAlchemy + PostgreSQL | Ground-side data handling and APIs |
| Sync | DTN-inspired outbox + signed bundles | Delay-tolerant data transfer |
| Infra | Docker + Kubernetes + Terraform | Deployment and environment readiness |

## 🔐 Key features

- Offline-first health monitoring for blackout conditions
- AES-256-GCM encrypted local storage
- Clinical interpretation with GREEN / YELLOW / RED states
- Trend analysis and threshold-based escalation logic
- Gamified health engagement and achievement tracking
- Signed, hashed bundle transmission for delayed sync
- Role-based access control and API-key validation on the backend

## 📁 Repository structure

```text
.
├── AstraVitals_System_Design_PRD.pdf
├── README.md
├── astrovitals/
│   ├── src/
│   ├── services/
│   ├── infra/
│   ├── docs/
│   ├── prisma/
│   ├── e2e/
│   ├── public/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   ├── main.ts
│   └── README.md
└── docs and deployment assets
```

## 🚀 Quick start

### Frontend app

```bash
cd astrovitals
npm install
npm run dev
```

### Electron desktop app

```bash
cd astrovitals
npm run electron:dev
```

### Docker stack

```bash
cd astrovitals
docker compose up --build
```

### Backend service

```bash
cd astrovitals/services/api
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload
```

## 🧠 Mission relevance

AstraVitals is designed to demonstrate how healthcare systems can remain operational in environments where Earth connectivity is limited or absent. The project highlights resilience, trust, and autonomy for crew operations in future lunar and deep-space missions.

## 📚 Documentation

- `AstraVitals_System_Design_PRD.pdf`
- `astrovitals/docs/project_summary.txt`
- `astrovitals/docs/project_summary.pdf`
- `astrovitals/docs/astrovitals_presentation.pdf`

## 🌌 Status

This repository represents a mission-ready concept prototype for offline-first crew health monitoring and is intended to evolve into a fuller operational system as the design is refined.

---

<div align="center">
  <img src="https://img.shields.io/badge/Designed%20for-NASA%20Hackathon-0B3D91?style=for-the-badge" alt="NASA Hackathon" />
</div>
