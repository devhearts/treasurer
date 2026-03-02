import CreateEventForm from "./CreateEventForm";

export const metadata = {
  title: "Create Event – CeremonyWallet",
};

export default function CreatePage() {
  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-lg mx-auto px-4 py-8">
        <CreateEventForm />
      </div>
    </main>
  );
}
