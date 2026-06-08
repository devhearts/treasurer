# CeremonyWallet

A contribution management platform for Ugandan social events (weddings, kwanjula, mabugo). Treasurers pay a flat subscription fee to create and manage events, and the platform never holds money—all contributions go directly to the treasurer via Mobile Money.

## Features

- **Event Management**: Create and manage wedding, kwanjula, and mabugo events
- **Contribution Tracking**: Track all contributions with detailed receipts
- **Wedding Invitations**: Generate personalized invitation cards for contributors
- **Treasurer Model**: Flat 50,000 UGX subscription fee—no platform fees on contributions

## Quick Start

### Prerequisites

- **Bun** (recommended) or Node.js 20+
- A modern web browser

### Installation

```bash
# Install dependencies
bun install
```

### Development

```bash
# Start the development server
bun dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
# Build for production
bun build

# Start the production server
bun start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── actions/            # Server actions (events, contributions)
│   ├── page.tsx            # Home page
│   ├── create/             # Create event wizard
│   └── events/             # Events listing and details
│       └── [slug]/invite/   # Wedding invitation cards
├── components/             # Reusable React components
└── lib/                    # Utilities, types, and data
    └── db/                 # SQLite schema, queries, seed
```

## Available Routes

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/events` | Browse all events |
| `/events/[slug]` | Event details and contribution form |
| `/events/[slug]/invite` | Generate wedding invitation cards |
| `/create` | Create a new event (treasurer subscription) |

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS 4**
- **SQLite** (better-sqlite3) + **Drizzle ORM** for persistence
- **Bun** or **Node.js 20+** (package manager)

## Commands

| Command | Description |
|---------|-------------|
| `npm install` / `bun install` | Install dependencies |
| `npm run dev` / `bun dev` | Start development server |
| `npm run build` / `bun build` | Build for production |
| `npm run start` / `bun start` | Start production server |
| `npm run db:seed` | Create DB and seed with demo events (run once) |
| `npm run lint` / `bun lint` | Run ESLint |
| `npm run typecheck` / `bun typecheck` | Run TypeScript type checking |

### Docker Compose and host ports

Full stack: `docker compose up --build`. Host ports are parameterized (`HOST_PORT_*`); defaults match the historical single-stack layout. When other containers already use those ports, use a profile (**dev +30**, **staging +40**, **production +50** on every published port): `npm run docker:up:dev` (or `docker:up:staging` / `docker:up:production`). See [`docker/README-ports.md`](docker/README-ports.md). Regenerate profile files after changing bases: `npm run docker:gen-ports`. CI / pre-push: `npm run docker:verify-ports`.

The SQLite database file is created at `data/ceremonywallet.db` on first use. To load demo events, run `npm run db:seed` once after installation.

## How It Works

### For Treasurers

1. **Subscribe**: Pay 50,000 UGX to activate your treasurer account
2. **Create Event**: Set up your wedding, kwanjula, or mabugo event
3. **Share Link**: Share the event page with contributors
4. **Receive Funds**: Contributors pay directly to your Mobile Money number

### For Contributors

1. **View Event**: Open the event link shared by the treasurer
2. **Contribute**: Enter your name and contribution amount
3. **Pay Directly**: Send money to the treasurer's Mobile Money number
4. **Get Receipt**: Copy or share your contribution receipt

## License

MIT
