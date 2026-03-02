export type EventType = "wedding" | "introduction" | "funeral" | "other";

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
}

export interface Contribution {
  id: string;
  eventId: string;
  name: string;
  anonymous: boolean;
  amount: number;
  phone: string;
  message?: string;
  status: "paid" | "pledged";
  date: string;
  /** True when added by treasurer (e.g. cash or off-form payment). */
  manual?: boolean;
}

export interface CeremonyEvent {
  id: string;
  title: string;
  type: EventType;
  organizer: string;
  treasurerPhone: string; // Mobile Money number where contributions are received
  description: string;
  targetAmount: number;
  raisedAmount: number;
  date: string;
  location: string;
  budgetItems: BudgetItem[];
  contributions: Contribution[];
  createdAt: string;
  slug: string;
  subscriptionPaid: boolean; // Has treasurer paid the subscription fee?
}
