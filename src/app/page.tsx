"use client";

import Link from "next/link";
import EventCard from "@/components/EventCard";
import { getAllEvents } from "@/lib/data";

export default function Home() {
  const featuredEvents = getAllEvents().slice(0, 3);

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-700 via-purple-800 to-purple-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span>🇺🇬</span> Built for Ugandan Social Events
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            The Transparent Treasurer
            <br />
            <span className="text-orange-400">for Every Ceremony</span>
          </h1>
          <p className="text-purple-200 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            Give your committee a professional tool to track contributions for
            weddings, kwanjula, and mabugo. We never hold your money — we just
            help you manage it transparently.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/create"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg"
            >
              Create Your Event
            </Link>
            <Link
              href="/events"
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors border border-white/20"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📝
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                1. Create Your Event
              </h3>
              <p className="text-gray-500">
                Set up your wedding, kwanjula, or mabugo in minutes. Add your
                budget and committee details.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                💝
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                2. Share with Guests
              </h3>
              <p className="text-gray-500">
                Send your event link to friends and family. They can contribute
                directly to your Mobile Money.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📊
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                3. Track & Thank
              </h3>
              <p className="text-gray-500">
                See who contributed, thank them automatically, and share
                receipts with full transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Featured Events
              </h2>
              <Link
                href="/events"
                className="text-purple-700 hover:text-purple-900 font-semibold text-sm"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why CeremonyWallet */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Prove your transparency — no more disputes
              </h2>
              <p className="text-gray-500 text-lg mb-6">
                As a treasurer, you know the struggle: people question where the
                money went. CeremonyWallet solves this by giving every
                contributor real-time visibility into contributions and how
                they&apos;re used.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-600">
                    Live contribution tracking
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-600">
                    Budget vs. actual comparison
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-600">
                    Shareable receipts for every contributor
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-600">
                    Personalised invitation cards for weddings
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-orange-50 rounded-2xl p-8 border border-purple-100">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <p className="text-purple-600 font-semibold mb-2">
                  For Treasurers
                </p>
                <p className="text-3xl font-extrabold text-gray-900 mb-4">
                  50,000 UGX
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  One-time activation fee. No monthly costs, no hidden
                  charges.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-6">
                  <li>✓ Unlimited contributors</li>
                  <li>✓ Unlimited contributions</li>
                  <li>✓ Custom event page</li>
                  <li>✓ Budget tracking</li>
                  <li>✓ Receipt generation</li>
                  <li>✓ Invitation cards (weddings)</li>
                </ul>
                <Link
                  href="/create"
                  className="block w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl text-center transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to manage your ceremony transparently?
          </h2>
          <p className="text-orange-100 text-lg mb-8">
            Join hundreds of treasurers across Uganda who trust CeremonyWallet
            for their events.
          </p>
          <Link
            href="/create"
            className="inline-block bg-white text-orange-600 font-bold px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-colors"
          >
            Create Your Event Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💍</span>
              <span className="text-white font-bold text-xl">CeremonyWallet</span>
            </div>
            <p className="text-sm">
              © 2024 CeremonyWallet. Built for Ugandan ceremonies.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
