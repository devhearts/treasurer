import { notFound } from "next/navigation";
import { getEventForEdit } from "@/app/actions/events";
import EditEventForm from "./EditEventForm";

export const metadata = {
  title: "Edit event · CeremonyWallet",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditEventPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getEventForEdit(slug);
  if (!data.success) notFound();

  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-lg mx-auto px-4 py-8">
        <EditEventForm
          slug={slug}
          initialEvent={data.event}
          imageGarageKeys={data.imageGarageKeys}
        />
      </div>
    </main>
  );
}
