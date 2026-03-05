# TreasurerPro Data Models Documentation

## Overview

This document describes the data models used in the TreasurerPro application - a contribution management platform for Ugandan social events.

## Data Models

### 1. CeremonyEvent (Parent Model)

The main entity representing social events in Uganda.

```typescript
interface CeremonyEvent {
  id: string;
  title: string;
  type: EventType;
  organizer: string;
  treasurerPhone: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  date: string;
  location: string;
  budgetItems: BudgetItem[];
  contributions: Contribution[];
  createdAt: string;
  slug: string;
  subscriptionPaid: boolean;
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| slug | string | URL-friendly identifier |
| title | string | Event name |
| type | EventType | wedding, introduction, funeral, other |
| organizer | string | Person organizing the event |
| treasurerPhone | string | Mobile Money number for contributions |
| targetAmount | number | Fundraising goal (UGX) |
| raisedAmount | number | Total collected so far |
| subscriptionPaid | boolean | Has treasurer paid subscription? |

### 2. BudgetItem (Child of Event)

Represents planned expenses for an event.

```typescript
interface BudgetItem {
  id: string;
  name: string;
  amount: number;
}
```

### 3. Contribution (Child of Event)

Represents money contributed to an event.

```typescript
interface Contribution {
  id: string;
  eventId: string;
  name: string;
  anonymous: boolean;
  amount: number;
  phone: string;
  message?: string;
  status: "paid" | "pledged";
  date: string;
}
```

### 4. EventType (Enum)

```typescript
type EventType = "wedding" | "introduction" | "funeral" | "other";
```

## Relationships

```
CeremonyEvent (1)
    ├── has many → BudgetItem (N)
    └── has many → Contribution (N)
```

- **One CeremonyEvent** can have **multiple BudgetItems** (e.g., Tent & Chairs, Catering, Photography)
- **One CeremonyEvent** can have **multiple Contributions** from different people
- Each **Contribution** references its parent **CeremonyEvent** via `eventId`

## Data Flow

1. **Treasurer** creates an event → `CeremonyEvent` with `budgetItems`
2. **Contributors** add money → `Contribution` records added to event
3. **System** automatically updates `raisedAmount` (sum of all contributions)
4. All data is persisted in **localStorage** (client-side only for this demo)

## Storage

All data is stored in the browser's localStorage with the key: `ceremonywallet_events`

## Seed Data

The application includes 3 example events:
1. **Wedding** - Sarah & James
2. **Introduction Ceremony (Kwanjula)** - Moses & Flavia  
3. **Funeral (Mabugo)** - Mr. Kato's burial

## Related Files

- [src/lib/types.ts](src/lib/types.ts) - TypeScript interfaces
- [src/lib/data.ts](src/lib/data.ts) - Data management functions
- [src/app/events/[slug]/ContributeForm.tsx](src/app/events/[slug]/ContributeForm.tsx) - Contribution form
- [src/app/create/CreateEventForm.tsx](src/app/create/CreateEventForm.tsx) - Event creation form
