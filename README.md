# SplitEase — Shared Expenses Tracker

A full-stack web application for tracking and splitting shared expenses among flatmates. Built for the Spreetail assignment.

## Features

- **User Authentication** — Register, login with JWT-based auth
- **Group Management** — Create groups with temporal membership (members can join and leave)
- **Expense Tracking** — Support for 4 split types: Equal, Unequal, Percentage, Share
- **Multi-Currency** — INR and USD with configurable exchange rate (₹83/$1)
- **Balance Calculation** — Per-user balances with expense-level breakdown
- **Debt Simplification** — Minimum transactions to settle all debts
- **CSV Import** — Import expenses from CSV with anomaly detection (18+ issues detected)
- **Import Reports** — Detailed report of every anomaly detected and action taken
- **Settlement Recording** — Record payments between members

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (relational, as required) |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| CSV Parsing | PapaParse |

## Project Structure

```
SharedExpensesTracker/
├── backend/             # Express API server
│   ├── prisma/          # Schema, migrations, seed
│   ├── src/
│   │   ├── config/      # Environment config
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/   # Auth, validation, errors
│   │   ├── routes/      # API route definitions
│   │   ├── services/    # Business logic
│   │   └── utils/       # CSV parser, name normalizer, date parser
│   └── server.js        # Entry point
├── frontend/            # React SPA
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── context/     # Auth context
│       ├── pages/       # Page components
│       ├── services/    # API client
│       └── utils/       # Formatting helpers
├── docs/                # Documentation
│   ├── SCOPE.md         # Anomaly log + DB schema
│   ├── DECISIONS.md     # Decision log
│   └── AI_USAGE.md      # AI usage documentation
└── Expenses Export.csv  # Original CSV (untouched)
```

## Setup Instructions

### Prerequisites

- Node.js v18+
- PostgreSQL 14+
- npm

### 1. Clone and Install

```bash
git clone <repo-url>
cd SharedExpensesTracker

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb shared_expenses

# Copy and edit environment variables
cd backend
cp .env.example .env
# Edit .env with your database URL
```

### 3. Run Migrations and Seed

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Start Development

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

### Default Login Credentials

All seeded users share the password: `password123`

| User | Email |
|------|-------|
| Aisha | aisha@splitease.com |
| Rohan | rohan@splitease.com |
| Priya | priya@splitease.com |
| Meera | meera@splitease.com |
| Dev | dev@splitease.com |
| Sam | sam@splitease.com |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | — |
| JWT_SECRET | Secret for JWT signing | dev-secret |
| JWT_EXPIRES_IN | Token expiry | 7d |
| PORT | Backend port | 5000 |
| CORS_ORIGINS | Allowed origins | http://localhost:5173 |
| USD_TO_INR_RATE | Exchange rate | 83.0 |

## API Documentation

See the full API at `/api/health` when running.

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/dashboard | User dashboard |
| POST | /api/groups | Create group |
| GET | /api/groups/:id/balances | Group balances |
| GET | /api/groups/:id/balances/simplified | Simplified debts |
| POST | /api/groups/:id/import | Upload CSV |
| GET | /api/imports/:id/report | Import report |

## CSV Import

The import feature detects and surfaces 18+ anomalies in the CSV including:
- Duplicate entries, name inconsistencies, format errors
- Missing fields, math errors, membership conflicts
- Settlements logged as expenses, ambiguous dates

Each anomaly is classified as Auto-Fixed, Warning, or Requires Action.

## AI Usage

This project was built with AI assistance. See [AI_USAGE.md](docs/AI_USAGE.md) for details.

## Future Enhancements

- Real-time exchange rates via API
- Push notifications for new expenses
- Receipt image upload
- Export to PDF/Excel
- Mobile app (React Native)
