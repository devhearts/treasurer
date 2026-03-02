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
│   ├── page.tsx           # Home page
│   ├── create/            # Create event wizard
│   └── events/            # Events listing and details
│       └── [slug]/invite/ # Wedding invitation cards
├── components/            # Reusable React components
└── lib/                   # Utilities, types, and data
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
- **Bun** (package manager)

## Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun dev` | Start development server |
| `bun build` | Build for production |
| `bun start` | Start production server |
| `bun lint` | Run ESLint |
| `bun typecheck` | Run TypeScript type checking |

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
