import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { events, budgetItems, contributions, users } from "./schema";
import type { CeremonyEvent } from "../types";

const SEED_USER_ID = "seed-user";

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

export function seedDb() {
  const db = getDb();
  const existing = db.select().from(events).limit(1).all();
  if (existing.length > 0) return;

  // Ensure seed user exists so events can have an owner
  const userExists = db.select().from(users).where(eq(users.id, SEED_USER_ID)).limit(1).all();
  if (userExists.length === 0) {
    db.insert(users).values({
      id: SEED_USER_ID,
      email: "seed@ceremonywallet.local",
      passwordHash: "",
      createdAt: new Date().toISOString(),
    }).run();
  }

  for (const ev of SEED_EVENTS) {
    db.insert(events).values({
      id: ev.id,
      userId: SEED_USER_ID,
      slug: ev.slug,
      title: ev.title,
      type: ev.type,
      organizer: ev.organizer,
      treasurerPhone: ev.treasurerPhone,
      description: ev.description,
      targetAmount: ev.targetAmount,
      raisedAmount: ev.raisedAmount,
      date: ev.date,
      location: ev.location,
      createdAt: ev.createdAt,
      subscriptionPaid: ev.subscriptionPaid,
    }).run();

    for (const b of ev.budgetItems) {
      db.insert(budgetItems).values({
        id: b.id,
        eventId: ev.id,
        name: b.name,
        amount: b.amount,
      }).run();
    }

    for (const c of ev.contributions) {
      db.insert(contributions).values({
        id: c.id,
        eventId: c.eventId,
        name: c.name,
        anonymous: c.anonymous,
        amount: c.amount,
        phone: c.phone,
        message: c.message ?? null,
        status: c.status,
        date: c.date,
      }).run();
    }
  }
}
