import CreateEventForm from "./CreateEventForm";

export const metadata = {
  title: "Create Event – CeremonyWallet",
};

export default function CreatePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Your Event
          </h1>
          <p className="text-gray-500 mt-2">
            Set up your ceremony fund page in minutes. Share the link and start
            collecting contributions transparently.
          </p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <CreateEventForm />
      </div>
    </main>
  );
}
