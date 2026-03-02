"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventType } from "@/lib/types";
import { addEvent } from "@/lib/data";

interface BudgetItemInput {
  id: string;
  name: string;
  amount: string;
}

const EVENT_TYPES: { value: EventType; label: string; emoji: string }[] = [
  { value: "wedding", label: "Wedding", emoji: "💍" },
  { value: "introduction", label: "Introduction (Kwanjula)", emoji: "🤝" },
  { value: "funeral", label: "Funeral (Mabugo)", emoji: "🕊️" },
  { value: "other", label: "Other Ceremony", emoji: "🎉" },
];

const SUBSCRIPTION_FEE = 50000; // UGX 50,000

export default function CreateEventForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("wedding");
  const [organizer, setOrganizer] = useState("");
  const [treasurerPhone, setTreasurerPhone] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  // Step 2 fields
  const [targetAmount, setTargetAmount] = useState("");
  const [budgetItems, setBudgetItems] = useState<BudgetItemInput[]>([
    { id: "1", name: "", amount: "" },
  ]);

  function addBudgetItem() {
    setBudgetItems([
      ...budgetItems,
      { id: String(Date.now()), name: "", amount: "" },
    ]);
  }

  function removeBudgetItem(id: string) {
    setBudgetItems(budgetItems.filter((item) => item.id !== id));
  }

  function updateBudgetItem(
    id: string,
    field: "name" | "amount",
    value: string
  ) {
    setBudgetItems(
      budgetItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  const budgetTotal = budgetItems.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 1500));
    
    // Create the new event object
    const newEvent = {
      id: String(Date.now()),
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50) || "new-event",
      title,
      type,
      organizer,
      treasurerPhone,
      description,
      targetAmount: Number(targetAmount) || 0,
      raisedAmount: 0,
      date,
      location,
      subscriptionPaid: true, // Mark as paid after subscription flow
      budgetItems: budgetItems
        .filter((item) => item.name && item.amount)
        .map((item) => ({
          id: item.id,
          name: item.name,
          amount: Number(item.amount),
        })),
      contributions: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    
    // Add to events storage
    addEvent(newEvent);
    
    setLoading(false);
    router.push(`/events/${newEvent.slug}`);
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s
                  ? "bg-purple-700 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {s}
            </div>
            <span
              className={`text-sm font-medium whitespace-nowrap ${
                step >= s ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {s === 1 ? "Event Details" : s === 2 ? "Budget" : "Subscribe"}
            </span>
            {s < 3 && (
              <div
                className={`w-8 h-0.5 ${
                  step > s ? "bg-purple-700" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
          className="space-y-5"
        >
          {/* Event Type */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              What type of event is this?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {EVENT_TYPES.map((et) => (
                <button
                  key={et.value}
                  type="button"
                  onClick={() => setType(et.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    type === et.value
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                >
                  <span className="text-2xl">{et.emoji}</span>
                  <span
                    className={`font-semibold text-sm ${
                      type === et.value ? "text-purple-700" : "text-gray-700"
                    }`}
                  >
                    {et.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Event Details</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Event Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. John & Mary's Wedding Fund"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Your Name (Treasurer) *
              </label>
              <input
                type="text"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                placeholder="e.g. Sarah Nakato (Committee Chair)"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Treasurer Phone - Key for receiving contributions */}
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <label className="block text-xs font-semibold text-orange-700 uppercase tracking-wider mb-1.5">
                📱 Your Mobile Money Number *
              </label>
              <p className="text-xs text-orange-600 mb-2">
                This is where contributors will send their money via Mobile Money.
                All contributions go directly to you — we never hold any funds.
              </p>
              <input
                type="tel"
                value={treasurerPhone}
                onChange={(e) => setTreasurerPhone(e.target.value)}
                placeholder="e.g. 0772 123 456"
                required
                className="w-full border border-orange-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-orange-500 mt-1">MTN or Airtel Money</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell people about this event and why their contribution matters..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Event Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Location *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kampala"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-4 rounded-xl transition-colors"
          >
            Next: Set Budget →
          </button>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
          className="space-y-5"
        >
          {/* Budget */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              💰 Budget Breakdown
            </h2>
            <p className="text-gray-500 text-sm">
              List what you need money for. This helps contributors understand
              where their money goes — and proves your transparency as treasurer.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Total Target Amount (UGX) *
              </label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 15000000"
                required
                min={10000}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
              {targetAmount && (
                <p className="text-xs text-gray-400 mt-1">
                  = UGX {Number(targetAmount).toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Budget Items (Optional)
                </label>
                <button
                  type="button"
                  onClick={addBudgetItem}
                  className="text-purple-700 text-xs font-semibold hover:text-purple-900"
                >
                  + Add Item
                </button>
              </div>
              <div className="space-y-2">
                {budgetItems.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        updateBudgetItem(item.id, "name", e.target.value)
                      }
                      placeholder={`Item ${idx + 1} (e.g. Tent Hire)`}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) =>
                        updateBudgetItem(item.id, "amount", e.target.value)
                      }
                      placeholder="Amount"
                      className="w-32 border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                    {budgetItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBudgetItem(item.id)}
                        className="text-red-400 hover:text-red-600 text-lg leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {budgetTotal > 0 && (
                <div className="flex justify-between text-sm font-semibold text-purple-700 mt-3 pt-3 border-t border-gray-100">
                  <span>Items Total</span>
                  <span>UGX {budgetTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
            <h3 className="font-bold text-purple-900 mb-3">
              📋 Event Summary
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-700">Title</span>
                <span className="font-medium text-purple-900 text-right max-w-[60%] truncate">
                  {title || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Type</span>
                <span className="font-medium text-purple-900">
                  {EVENT_TYPES.find((t) => t.value === type)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Date</span>
                <span className="font-medium text-purple-900">
                  {date
                    ? new Date(date).toLocaleDateString("en-UG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Location</span>
                <span className="font-medium text-purple-900">
                  {location || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Target</span>
                <span className="font-medium text-purple-900">
                  {targetAmount
                    ? `UGX ${Number(targetAmount).toLocaleString()}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-700">Your Phone</span>
                <span className="font-medium text-purple-900">
                  {treasurerPhone || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <button
              type="submit"
              className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-bold py-4 rounded-xl transition-colors"
            >
              Next: Pay Subscription →
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Subscription Payment */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subscription Info */}
          <div className="bg-gradient-to-br from-purple-50 to-orange-50 rounded-2xl p-6 border border-purple-200">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">👛</div>
              <h2 className="text-xl font-bold text-gray-900">
                Pay Subscription to Activate
              </h2>
              <p className="text-gray-500 text-sm mt-2">
                One-time fee to unlock all features for this event
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">
                  CeremonyWallet Subscription
                </span>
                <span className="text-2xl font-bold text-purple-700">
                  UGX {SUBSCRIPTION_FEE.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <p className="text-sm text-orange-800 font-semibold mb-2">
                📱 Payment goes to CeremonyWallet
              </p>
              <p className="text-xs text-orange-600 leading-relaxed">
                This fee covers our platform costs. <strong>All contributions</strong> from
                guests go directly to <strong>your Mobile Money number</strong> — we never
                touch that money. Contributors pay directly to you.
              </p>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">
              How to Pay (MTN or Airtel)
            </h3>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  1
                </span>
                <span>Open your Mobile Money app or dial <strong>*165#</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </span>
                <span>Select <strong>Pay Bill</strong> → <strong>Business</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </span>
                <span>Enter business number: <strong className="text-purple-700">123456</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  4
                </span>
                <span>Enter amount: <strong>UGX 50,000</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  5
                </span>
                <span>Enter reference: <strong className="text-purple-700">YourName</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  6
                </span>
                <span>Confirm payment</span>
              </li>
            </ol>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  className="mt-1 w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-600">
                  I have made the payment of <strong>UGX 50,000</strong> to
                  CeremonyWallet
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-4 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-4 rounded-xl transition-colors"
            >
              {loading ? "Activating..." : "✅ Activate My Event"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
