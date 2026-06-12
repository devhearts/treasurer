import MobileCaptureWizard from "./MobileCaptureWizard";

export const metadata = {
  title: "Capture verification photos – CeremonyWallet",
};

export default async function VerifyCapturePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-light">
      <div className="bg-surface text-light text-center py-4 px-4">
        <p className="font-semibold">CeremonyWallet verification</p>
        <p className="text-sm text-light/70 mt-1">Use your phone camera only</p>
      </div>
      <MobileCaptureWizard token={token} />
    </main>
  );
}
