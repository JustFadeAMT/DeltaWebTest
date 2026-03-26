# Delta-Neutral Options Trading Web App

A production-style web application for delta-neutral options trading on **Deribit** with Paper Trading and Live Trading modes.

![Architecture](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi) ![Frontend](https://img.shields.io/badge/Frontend-Next.js-000?style=flat&logo=next.js) ![Exchange](https://img.shields.io/badge/Exchange-Deribit-blue?style=flat)

## Features

- **Paper Trading** — Simulate delta-neutral strategies with real Deribit market data
- **Live Trading** — Execute real orders on Deribit (Phase 2)
- **Delta-Neutral Entry** — Long Call + Short Perp or Long Put + Long Perp packages
- **Exchange Delta** — Uses Deribit-provided greeks, not self-calculated
- **PnL Monitoring** — Real-time option/perp/total PnL with time-series charts
- **Risk Controls** — Position limits, notional caps, hedge validation
- **Professional UI** — Dark trading dashboard with glassmorphic cards

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts, TanStack Query, Zustand |
| Backend | Python 3.11, FastAPI, SQLAlchemy, APScheduler |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Exchange | Deribit REST API |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Deribit Testnet API keys (optional, for market data authentication)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Deribit API keys (optional)

python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Open the App

Navigate to **http://localhost:3000**

## Project Structure

```
DeltaNeutralWeb/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings (Pydantic)
│   │   ├── database.py          # SQLAlchemy async setup
│   │   ├── models.py            # ORM models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── routers/             # API endpoints
│   │   │   ├── health.py
│   │   │   ├── market.py
│   │   │   ├── positions.py
│   │   │   └── portfolio.py
│   │   ├── services/            # Business logic
│   │   │   ├── deribit_client.py
│   │   │   ├── market_data_service.py
│   │   │   ├── paper_trading_service.py
│   │   │   └── risk_service.py
│   │   └── tasks/
│   │       └── pnl_snapshot_task.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   │   ├── monitor/
│   │   │   ├── paper-trading/
│   │   │   └── live-trading/
│   │   ├── components/          # React components
│   │   ├── lib/                 # API client, store
│   │   └── types/               # TypeScript types
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/market/underlying` | Current ETH/BTC price |
| GET | `/api/market/expiries` | Available option expiries |
| GET | `/api/market/options-chain` | Options chain with greeks |
| GET | `/api/market/instrument/{name}` | Instrument detail |
| GET | `/api/market/suggested-hedge` | Delta-neutral hedge suggestion |
| GET | `/api/positions` | List positions |
| POST | `/api/positions/paper` | Create paper position |
| POST | `/api/positions/{id}/close` | Close position |
| GET | `/api/positions/{id}/history` | PnL history |
| GET | `/api/portfolio/summary` | Portfolio summary |
| GET | `/api/portfolio/events` | Event log |

## Configuration

Key environment variables in `backend/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ENVIRONMENT` | `testnet` | `testnet` or `mainnet` |
| `DERIBIT_API_KEY` | (empty) | Deribit API key |
| `DERIBIT_API_SECRET` | (empty) | Deribit API secret |
| `SNAPSHOT_INTERVAL_SECONDS` | `30` | PnL snapshot interval |
| `MAX_PAPER_POSITIONS` | `20` | Max paper positions |
| `MAX_LIVE_POSITIONS` | `5` | Max live positions |

## Roadmap

- [x] **Phase 1** — Paper Trading with real market data
- [ ] **Phase 2** — Live Trading on Deribit Testnet
- [ ] **Phase 3** — Mainnet, portfolio dashboard, multi-layer management
