"use client";

import { useState } from "react";
import { addContribution } from "@/lib/data";

interface ContributeFormProps {
  eventId: string;
  eventTitle: string;
  treasurerPhone: string;
}

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];

export default function ContributeForm({
  eventId,
  eventTitle,
  treasurerPhone,
}: ContributeFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [type, setType] = useState<"pay" | "pledge">("pay");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyPhoneNumber() {
    navigator.clipboard.writeText(treasurerPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePreset(val: number) {
    setAmount(String(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // Simulate processing
    await new Promise((r) => setTimeout(r, 1500));
    
    // Save contribution to localStorage
    addContribution(eventTitle.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-").slice(0, 50) || "new-event", {
      name: anonymous ? "Anonymous" : name,
      anonymous,
      amount: Number(amount),
      phone,
      message,
      status: type === "pay" ? "paid" : "pledged",
      date: new Date().toISOString().split("T")[0],
    });
    
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {type === "pay" ? "Thank you!" : "Pledge Recorded!"}
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          {type === "pay"
            ? `Your contribution of UGX ${Number(amount).toLocaleString()} to "${eventTitle}" has been received.`
            : `Your pledge of UGX ${Number(amount).toLocaleString()} has been recorded. You'll receive a reminder to complete your payment.`}
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setAmount("");
            setName("");
            setPhone("");
            setMessage("");
          }}
          className="text-purple-700 text-sm font-semibold hover:underline"
        >
          Make another contribution
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        💝 Contribute Now
      </h2>

      {/* Treasurer Payment Info */}
      <div className="bg-green-50 rounded-xl p-4 border border-green-200 mb-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📱</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">
              💰 Pay directly to the treasurer
            </p>
            <p className="text-xs text-green-600 mt-1 leading-relaxed">
              Your money goes straight to the treasurer&apos;s Mobile Money. 
              We never hold any funds — 100% goes to them.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <p className="text-xl font-bold text-green-700">
                {treasurerPhone}
              </p>
              <button
                type="button"
                onClick={copyPhoneNumber}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {copied ? "✓ Copied!" : "Copy Number"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pay vs Pledge Toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-5">
        <button
          type="button"
          onClick={() => setType("pay")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            type === "pay"
              ? "bg-purple-700 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          Pay Now
        </button>
        <button
          type="button"
          onClick={() => setType("pledge")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            type === "pledge"
              ? "bg-purple-700 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          Pledge
        </button>
      </div>

      {type === "pay" && (
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 mb-5 text-sm">
          <p className="font-semibold text-orange-800 mb-3">
            📲 Follow these steps to pay (takes 30 seconds):
          </p>
          <ol className="text-xs text-orange-700 space-y-2">
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>Open your Mobile Money app or dial <strong>*165#</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Select <strong>Send Money</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Enter treasurer&apos;s number: <strong className="text-orange-900">{treasurerPhone}</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <span>Enter amount: <strong>UGX {amount ? Number(amount).toLocaleString() : "..."}</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
              <span>Confirm — money goes straight to the treasurer!</span>
            </li>
          </ol>
          <div className="mt-4 pt-3 border-t border-orange-200">
            <p className="text-xs text-orange-600 font-medium">
              ✅ After you&apos;ve sent the money, come back and click &quot;I&apos;ve Paid&quot; below to record your contribution.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Preset Amounts */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Quick Amounts (UGX)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePreset(preset)}
                className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  amount === String(preset)
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:border-orange-300"
                }`}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Amount (UGX)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            required
            min={1000}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Name */}
        {!anonymous && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auntie Grace"
              required={!anonymous}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        )}

        {/* Phone */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Your Mobile Money Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0772 123 456"
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">MTN or Airtel Money</p>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a blessing or message..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none"
          />
        </div>

        {/* Anonymous Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setAnonymous(!anonymous)}
            className={`w-10 h-6 rounded-full transition-colors relative ${
              anonymous ? "bg-purple-600" : "bg-gray-200"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                anonymous ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </div>
          <span className="text-sm text-gray-600">Contribute anonymously</span>
        </label>

        {/* Amount Summary */}
        {amount && Number(amount) > 0 && (
          <div className="bg-purple-50 rounded-xl p-3 text-sm border border-purple-100">
            <div className="flex justify-between font-semibold text-purple-900">
              <span>{type === "pay" ? "Amount to Pay" : "Pledge Amount"}</span>
              <span>UGX {Number(amount).toLocaleString()}</span>
            </div>
            <p className="text-xs text-purple-500 mt-1">
              💡 Pays directly to treasurer — we never hold funds
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
        >
          {loading
            ? "Recording..."
            : type === "pay"
            ? `✅ I've Paid UGX ${amount ? Number(amount).toLocaleString() : "..."}`
            : `📋 Record Pledge of UGX ${amount ? Number(amount).toLocaleString() : "..."}`}
        </button>
      </form>
    </div>
  );
}
