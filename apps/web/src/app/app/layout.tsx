import Navbar from "@/components/Navbar";
import VerificationBanner from "@/components/verification/VerificationBanner";
import { getCurrentUser } from "@/lib/auth-server";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <>
      <Navbar />
      {user && user.accountVerificationStatus && (
        <VerificationBanner
          status={user.accountVerificationStatus}
          rejectionReason={user.accountVerificationRejectionReason}
        />
      )}
      {children}
    </>
  );
}
