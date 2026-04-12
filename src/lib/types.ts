export type EventType = "wedding" | "introduction" | "funeral" | "other";

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
}

/** Fundraising sub-goal within an event; progress = sum of visible allocations. */
export interface MilestoneItem {
  id: string;
  name: string;
  targetAmount: number;
  /** Sum of amounts from visible contributions tagged to this milestone. */
  raisedAmount: number;
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
  /** For pledges: when the contributor hopes to pay (YYYY-MM-DD). */
  pledgeHopeBy?: string;
  /** True when added by treasurer (e.g. cash or off-form payment). */
  manual?: boolean;
  /** False = hidden from public page and receipt; omitted/true = shown. */
  visible?: boolean;
  /** Optional milestone this contribution counts toward. */
  milestoneId?: string | null;
}

export interface CeremonyEvent {
  id: string;
  /** Owner's user id (set for events created by logged-in users). */
  userId?: string | null;
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
  milestoneItems: MilestoneItem[];
  contributions: Contribution[];
  createdAt: string;
  slug: string;
  subscriptionPaid: boolean; // Has treasurer paid the subscription fee?
}
