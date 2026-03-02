import { CeremonyEvent } from "./types";

// Initial seed events for demo
const SEED_EVENTS: CeremonyEvent[] = [
  {
    id: "1",
    slug: "john-mary-wedding-2024",
    title: "John & Mary's Wedding Fund",
    type: "wedding",
    organizer: "Sarah Nakato",
    treasurerPhone: "0772123456",
    description:
      "Help us celebrate the union of John Ssemakula and Mary Namutebi. Your contributions will go towards making their special day unforgettable. Every shilling counts!",
    targetAmount: 15000000,
    raisedAmount: 9250000,
    date: "2024-04-15",
    location: "Kampala, Uganda",
    subscriptionPaid: true,
    budgetItems: [
      { id: "b1", name: "Tent & Chairs Hire", amount: 3000000 },
      { id: "b2", name: "Catering (200 guests)", amount: 6000000 },
      { id: "b3", name: "Photography & Video", amount: 2000000 },
      { id: "b4", name: "Bride's Dress & Groom's Suit", amount: 2500000 },
      { id: "b5", name: "Decorations & Flowers", amount: 1500000 },
    ],
    contributions: [
      {
        id: "c1",
        eventId: "1",
        name: "Auntie Grace",
        anonymous: false,
        amount: 500000,
        phone: "07XX",
        message: "Wishing you a blessed union!",
        status: "paid",
        date: "2024-03-01",
      },
      {
        id: "c2",
        eventId: "1",
        name: "Anonymous",
        anonymous: true,
        amount: 200000,
        phone: "07XX",
        status: "paid",
        date: "2024-03-03",
      },
      {
        id: "c3",
        eventId: "1",
        name: "Peter Ochieng",
        anonymous: false,
        amount: 1000000,
        phone: "07XX",
        message: "From the Ochieng family, congratulations!",
        status: "paid",
        date: "2024-03-05",
      },
      {
        id: "c4",
        eventId: "1",
        name: "Kampala Office Team",
        anonymous: false,
        amount: 750000,
        phone: "07XX",
        status: "pledged",
        date: "2024-03-10",
      },
      {
        id: "c5",
        eventId: "1",
        name: "Uncle Robert",
        anonymous: false,
        amount: 300000,
        phone: "07XX",
        message: "May God bless your home",
        status: "paid",
        date: "2024-03-12",
      },
    ],
    createdAt: "2024-02-20",
  },
  {
    id: "2",
    slug: "nakato-introduction-ceremony",
    title: "Nakato's Introduction Ceremony (Kwanjula)",
    type: "introduction",
    organizer: "Nakato Family",
    treasurerPhone: "0700123456",
    description:
      "We are preparing for the introduction ceremony of our daughter Fatuma Nakato. The ceremony will be held at our family home in Mukono. Please contribute to help us host our guests with dignity.",
    targetAmount: 8000000,
    raisedAmount: 5600000,
    date: "2024-05-20",
    location: "Mukono, Uganda",
    subscriptionPaid: true,
    budgetItems: [
      { id: "b1", name: "Food & Drinks", amount: 3000000 },
      { id: "b2", name: "Gomesi & Kanzu (Traditional Attire)", amount: 1500000 },
      { id: "b3", name: "Gifts for Groom's Family", amount: 2000000 },
      { id: "b4", name: "Tent & Setup", amount: 1500000 },
    ],
    contributions: [
      {
        id: "c1",
        eventId: "2",
        name: "Mama Sarah",
        anonymous: false,
        amount: 500000,
        phone: "07XX",
        message: "Our daughter, we are proud of you!",
        status: "paid",
        date: "2024-04-01",
      },
      {
        id: "c2",
        eventId: "2",
        name: "Anonymous",
        anonymous: true,
        amount: 1000000,
        phone: "07XX",
        status: "paid",
        date: "2024-04-05",
      },
    ],
    createdAt: "2024-03-15",
  },
  {
    id: "3",
    slug: "ssali-family-funeral-arrangements",
    title: "Ssali Family Funeral Arrangements (Mabugo)",
    type: "funeral",
    organizer: "Ssali Family Committee",
    treasurerPhone: "0750987654",
    description:
      "We have lost our beloved father, Mzee James Ssali. We are collecting contributions to help with the funeral arrangements and burial. Your support during this difficult time means everything to us.",
    targetAmount: 5000000,
    raisedAmount: 4100000,
    date: "2024-03-25",
    location: "Masaka, Uganda",
    subscriptionPaid: true,
    budgetItems: [
      { id: "b1", name: "Coffin & Burial Costs", amount: 1500000 },
      { id: "b2", name: "Food for Mourners (3 days)", amount: 2000000 },
      { id: "b3", name: "Transport for Family", amount: 800000 },
      { id: "b4", name: "Miscellaneous", amount: 700000 },
    ],
    contributions: [
      {
        id: "c1",
        eventId: "3",
        name: "Kampala Clan Members",
        anonymous: false,
        amount: 2000000,
        phone: "07XX",
        message: "Rest in peace, Mzee.",
        status: "paid",
        date: "2024-03-20",
      },
      {
        id: "c2",
        eventId: "3",
        name: "Anonymous",
        anonymous: true,
        amount: 500000,
        phone: "07XX",
        status: "paid",
        date: "2024-03-21",
      },
    ],
    createdAt: "2024-03-18",
  },
];

const STORAGE_KEY = "ceremonywallet_events";

// Load events from localStorage or use seed data
function loadEvents(): CeremonyEvent[] {
  if (typeof window === "undefined") {
    // Server-side: return seed events (first time only)
    return SEED_EVENTS;
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // First time on client: initialize with seed events
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EVENTS));
    return SEED_EVENTS;
  } catch {
    return SEED_EVENTS;
  }
}

// Save events to localStorage
function saveEvents(events: CeremonyEvent[]): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.error("Failed to save events:", e);
    }
  }
}

// Get all events (works on both server and client)
export function getAllEvents(): CeremonyEvent[] {
  return loadEvents();
}

// Get event by slug
export function getEventBySlug(slug: string): CeremonyEvent | undefined {
  const events = loadEvents();
  return events.find((e) => e.slug === slug);
}

// Add a new event (client-side only)
export function addEvent(event: CeremonyEvent): void {
  const events = loadEvents();
  events.push(event);
  saveEvents(events);
}

// Add contribution to an event
export function addContribution(
  eventSlug: string,
  contribution: Omit<CeremonyEvent["contributions"][0], "id" | "eventId">
): boolean {
  const events = loadEvents();
  const eventIndex = events.findIndex((e) => e.slug === eventSlug);
  
  if (eventIndex === -1) return false;
  
  const newContribution = {
    ...contribution,
    id: `c${Date.now()}`,
    eventId: events[eventIndex].id,
  };
  
  events[eventIndex].contributions.push(newContribution);
  events[eventIndex].raisedAmount += contribution.amount;
  
  saveEvents(events);
  return true;
}

// Export seed events for server-side initial load
export const SEED_EVENTS_DATA = SEED_EVENTS;

// Helper functions
export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

export function getProgressPercent(raised: number, target: number): number {
  return Math.min(Math.round((raised / target) * 100), 100);
}

export function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    wedding: "Wedding",
    introduction: "Introduction (Kwanjula)",
    funeral: "Funeral (Mabugo)",
    other: "Other Ceremony",
  };
  return labels[type] ?? "Ceremony";
}

export function getEventTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    wedding: "💍",
    introduction: "🤝",
    funeral: "🕊️",
    other: "🎉",
  };
  return emojis[type] ?? "🎉";
}
