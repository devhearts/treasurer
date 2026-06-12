import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getVerificationStatus } from "@/app/actions/verification";
import VerifyAccountWizard from "./VerifyAccountWizard";

export const metadata = {
  title: "Verify account – CeremonyWallet",
};

export default async function VerifyAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const status = await getVerificationStatus();

  return (
    <main className="min-h-screen bg-light">
      <VerifyAccountWizard initialStatus={status} />
    </main>
  );
}
