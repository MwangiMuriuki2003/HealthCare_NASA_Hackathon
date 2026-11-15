<div align="center">
  <img src="https://img.shields.io/badge/AstraVitals-Offline%20Crew%20Health-0B1026?style=for-the-badge&logo=rocket&logoColor=white" alt="AstraVitals" />
  <br />
  <img src="https://img.shields.io/badge/Frontend-Next.js%20%2B%20React-61DAFB?style=flat-square&logo=nextdotjs&logoColor=black" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="Backend" />
  <img src="https://img.shields.io/badge/Security-Encrypted%20Offline-8B5CF6?style=flat-square" alt="Security" />
</div>

# 🚀 AstraVitals

AstraVitals is an offline-first crew health monitoring system built for deep-space missions. It helps astronauts log and interpret vital signs even when Earth connectivity is delayed, limited, or unavailable.

## ✨ What it does

- records six critical medical signals
- evaluates readings with clinically grounded thresholds
- visualizes trend changes over time
- provides GREEN / YELLOW / RED interpretation states
- encourages healthy habits with achievements and engagement
- queues signed health bundles for delayed Earth transmission

## 🩺 Key capabilities

- Heart rate tracking
- Blood pressure monitoring
- Blood glucose logging
- Body temperature tracking
- Sleep duration analysis
- Body-map and dashboard insights
- Offline-first encrypted local data storage

## 🧱 Tech stack

- Frontend: Next.js, React, TypeScript, Electron
- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Security: AES-256-GCM, signed bundles, RBAC, API-key validation
- Deployment: Docker, Kubernetes, Terraform

## 🏗️ Project structure

```text
astrovitals/
├── src/
├── services/
├── infra/
├── docs/
├── prisma/
├── e2e/
├── public/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── main.ts
├── README.md
└── ...
```

## ⚡ Run locally

```bash
cd astrovitals
npm install
npm run dev
```

```bash
npm run electron:dev
```

```bash
docker compose up --build
```

## 🌌 Mission relevance

This project demonstrates a resilient approach to crew health management in environments where constant connectivity cannot be assumed. It emphasizes autonomy, safety, and data integrity under extreme mission conditions.

## 📚 References

- `AstraVitals_System_Design_PRD.pdf`
- `docs/project_summary.txt`
- `docs/project_summary.pdf`
- `docs/astrovitals_presentation.pdf`

