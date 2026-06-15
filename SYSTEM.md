# CeremonyWallet — Full System Description

## 1. Overview

**CeremonyWallet** (repository name: **treasurer**) is a contribution management web application for social events: weddings, introductions, and condolences. It positions itself as a **digital treasurer**: treasurers pay a flat one-time subscription to create and manage events; MoMo contributions credit the event owner’s **CeremonyWallet balance**, which can be withdrawn to saved Mobile Money or bank payout methods (MTN / Airtel / bank).

The application is a single-page-oriented Next.js site with client-side persistence (localStorage). There is no backend database or authentication in the current implementation.

---

## 2. Purpose and Users

### Treasurers (event organizers)

- Create events (wedding, introduction, condolence, fundraising tithe and offertories, or other).
- Set event details, target amount, and budget breakdown.
- Pay a one-time 50,000 UGX subscription to activate the event (payment is simulated in-app).
- Share the event link; receive contributions directly to their Mobile Money number.
- View contributions (paid vs pledged), progress, and budget.
- Copy or share a contribution receipt for transparency.
- For weddings only: generate personalised invitation cards and share via WhatsApp.

### Contributors (guests)

- Open the event page via shared link.
- See event info, budget, and progress.
- Contribute by: choosing amount (presets or custom), name, phone, optional message, and optional anonymity.
- Choose “Pay Now” (record as paid after sending Mobile Money) or “Pledge” (record as pledged).
- Pay directly to the treasurer’s Mobile Money number (instructions in-app); then record the contribution in the app.

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4, PostCSS |
| Font | Geist (next/font/google) |
| Package manager | Bun (recommended); Node.js 20+ supported |
| Data persistence | Browser localStorage only (no server DB) |

---

## 4. Repository and Project Structure

```
treasurer/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout (Geist, Navbar, globals)
│   │   ├── page.tsx                # Home (hero, how it works, featured events, CTA)
│   │   ├── globals.css             # Tailwind import
│   │   ├── create/
│   │   │   ├── page.tsx            # Create-event page shell
│   │   │   └── CreateEventForm.tsx  # Multi-step wizard (details → budget → subscribe)
│   │   └── events/
│   │       ├── page.tsx            # Events list (all events, filter tabs)
│   │       └── [slug]/
│   │           ├── page.tsx        # Event detail (about, budget, contributions, contribute form)
│   │           ├── ContributeForm.tsx
│   │           └── invite/
│   │               ├── page.tsx    # Wedding invitation page (wedding-only)
│   │               └── InviteCardGenerator.tsx
│   ├── components/
│   │   ├── Navbar.tsx              # Logo, Browse Events, Create Event
│   │   ├── EventCard.tsx           # Event card for list/featured
│   │   └── ContributionReceipt.tsx # Receipt text + copy / WhatsApp
│   └── lib/
│       ├── types.ts                # EventType, BudgetItem, Contribution, CeremonyEvent
│       └── data.ts                 # In-memory + localStorage CRUD, seed data, helpers
├── package.json
├── next.config.ts
├── tsconfig.json                   # Path alias @/* → ./src/*
├── AGENTS.md                       # Agent rules (recipes, memory bank)
└── .kilocode/                     # Optional recipes (e.g. add-database)
```

---

## 5. Data Model

### Core types (`src/lib/types.ts`)

- **EventType**: `"wedding" | "introduction" | "funeral" | "other"`.
- **BudgetItem**: `id`, `name`, `amount` (number).
- **Contribution**: `id`, `eventId`, `name`, `anonymous`, `amount`, `phone`, `message?`, `status` (`"paid" | "pledged"`), `date`.
- **CeremonyEvent**: `id`, `title`, `type`, `organizer`, `treasurerPhone`, `description`, `targetAmount`, `raisedAmount`, `date`, `location`, `budgetItems[]`, `contributions[]`, `createdAt`, `slug`, `subscriptionPaid`.

### Persistence (`src/lib/data.ts`)

- **Storage key**: `ceremonywallet_events`.
- **Server vs client**: On the server, `loadEvents()` returns seed data only. In the browser, it reads/writes localStorage; if empty, it initializes from seed and then saves.
- **API**: `getAllEvents()`, `getEventBySlug(slug)`, `addEvent(event)`, `addContribution(eventSlug, contribution)`.
- **Helpers**: `formatUGX`, `getProgressPercent`, `getEventTypeLabel`, `getEventTypeEmoji`.
- **Seed**: Three demo events (wedding, introduction, condolence) with budgets and contributions.

Important: All mutations (`addEvent`, `addContribution`) only run in the client (localStorage). Server-rendered pages that call `getEventBySlug` or `getAllEvents` see only seed data until the client hydrates and uses the same module, which then reads from localStorage.

---

## 6. Routes and Behaviour

| Route | Description |
|-------|-------------|
| `/` | Home: hero, “How it works”, featured events (first 3), “Why CeremonyWallet”, 50k UGX CTA, footer. |
| `/events` | List all events; filter tabs (All, Weddings, Introductions, Condolences) — filter state is present but not wired to filter the list. |
| `/events/[slug]` | Event detail: header, about, budget breakdown, contributions list, contribution receipt block, contribute form (right column). For weddings, link to `/events/[slug]/invite`. |
| `/events/[slug]/invite` | Wedding-only; 404 for non-wedding. Invitation card generator (personal message, per-contributor invites, custom invite). Copy / WhatsApp share. |
| `/create` | Create event: 3-step wizard (Event details → Budget → Subscribe). On “Activate”, event is appended via `addEvent()` and user is redirected to `/events/{slug}`. |

Slug for a new event is derived from the title (lowercase, strip non-alphanumeric, spaces to hyphens, max 50 chars). Contribution form uses a slug derived from the event title when calling `addContribution` (not the event’s stored `slug`); for consistency it would be better to pass and use `event.slug`.

---

## 7. Key User Flows

### Create event (treasurer)

1. Open `/create`.
2. Step 1: Choose type (wedding / introduction / condolence / fundraising tithe and offertories / other), title, organizer name, treasurer Mobile Money number, description, date, location.
3. Step 2: Target amount (UGX), optional budget items (name + amount). Summary shown.
4. Step 3: Subscription 50,000 UGX — instructions to pay to “CeremonyWallet” (business number 123456), then checkbox “I have made the payment” and “Activate My Event”.
5. Submit: short delay (simulated payment), then `addEvent()` and redirect to `/events/{slug}`.

### Contribute (guest)

1. Open event page from link.
2. See treasurer’s Mobile Money number and “Pay directly” copy.
3. Choose Pay Now vs Pledge; if Pay Now, follow in-app Mobile Money steps, then record.
4. Enter amount (presets or custom), name (or anonymous), phone, optional message.
5. Submit: contribution is added via `addContribution()`; `raisedAmount` is updated in the stored event. Success message with option to contribute again.

### Receipt and invitations

- **Receipt**: On event page, “Contribution Receipt” builds a text summary (event, date, location, list of contributions with amounts and status, total cash raised, target, progress). Copy or share via WhatsApp.
- **Invitations**: Only for `type === "wedding"`. From event page go to “Create Invitation Cards”. Customise one message; generate per-contributor personalised text (guest name, event title, date, location, message); optional custom invitation (guest name + preview). Copy or “Send on WhatsApp” for each.

---

## 8. UI and Theming

- **Layout**: Sticky top navbar (CeremonyWallet logo, Browse Events, Create Event). Main content in max-width containers (e.g. max-w-6xl, max-w-5xl).
- **Palette**: Purple (primary), orange (CTA / progress), green (payment/success), pink (invitations), gray neutrals.
- **Typography**: Geist sans, Tailwind utilities. UGX amounts formatted with `en-UG` locale where applicable.
- **Responsiveness**: Grids and flex layouts with breakpoints (e.g. `md:grid-cols-2`, `lg:col-span-2`). Event detail has a sticky right column on large screens.

---

## 9. Configuration and Scripts

- **next.config.ts**: Default (no custom config).
- **tsconfig**: Strict mode, path alias `@/*` → `./src/*`.
- **Scripts** (from package.json): `dev`, `build`, `start`, `lint`, `typecheck`.

---

## 10. Agent and Recipe Context

- **AGENTS.md**: Instructs to check `.kilocode/recipes/` for optional features (e.g. add-database) and to update the memory bank after changes.
- **.kilocode/recipes/add-database.md**: Recipe for adding data persistence (e.g. when moving off localStorage).

---

## 11. Limitations and Notes

- **No backend**: All state is in the client; no user accounts, no server-side validation or storage. Data is per-browser (localStorage).
- **Subscription**: 50k UGX payment is simulated (checkbox + delay). No real payment gateway or verification.
- **Slug consistency**: New event slug is computed from title; `ContributeForm` also derives slug from `eventTitle` when calling `addContribution`. Using the event’s stored `slug` in the form would avoid mismatches.
- **Events list filter**: Filter tabs on `/events` do not currently filter the list (no state tied to filtering).
- **Invite page**: Uses `getEventBySlug(slug)`; on first server render this is seed-only, so invite page may not see client-created events until client-side navigation/hydration.
- **Share / Copy**: Event detail “Share this event” shows a URL and Copy button; copy handler is not implemented in the snippet (button present, logic could be added).

---

## 12. Summary

CeremonyWallet is a Next.js 16 + React 19 + TypeScript + Tailwind 4 front-end for social event fundraising. It provides event creation (with a simulated treasurer subscription), contribution recording (pay/pledge, direct to treasurer Mobile Money), receipt generation, and wedding-specific invitation card generation with WhatsApp sharing. Data lives only in the browser via localStorage and seed data, with no backend or authentication.
