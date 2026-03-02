import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">👛</span>
            <span className="font-bold text-xl text-purple-700">
              Ceremony<span className="text-orange-500">Wallet</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/events"
              className="text-gray-600 hover:text-purple-700 font-medium text-sm transition-colors"
            >
              Browse Events
            </Link>
            <Link
              href="/create"
              className="bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              + Create Event
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
