import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { IconBack, IconUser } from "@/components/Icons";
import ProfileLogout from "./ProfileLogout";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata = {
  title: "Profile – CeremonyWallet",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-light pb-24">
      <div className="max-w-lg mx-auto px-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1 text-muted hover:text-surface text-sm py-4"
        >
          <IconBack className="w-4 h-4" />
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">Back to home</span>
        </Link>

        <div className="bg-light rounded-xl border border-muted/30 overflow-hidden mb-4">
          <div className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-muted/20 flex items-center justify-center text-surface flex-shrink-0">
              <IconUser className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-surface">Profile</h1>
              <p className="text-sm text-muted truncate" title={user.email}>
                {user.email}
              </p>
            </div>
          </div>
          <div className="px-6 pb-6 border-t border-muted/20 pt-4">
            <p className="text-xs text-muted mb-1">Signed in as</p>
            <p className="font-medium text-surface mb-4 truncate">{user.email}</p>
            <ProfileLogout />
          </div>
        </div>

        <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
          <div className="p-4 border-b border-muted/20">
            <h2 className="font-bold text-surface">Change password</h2>
            <p className="text-sm text-muted">Update your password.</p>
          </div>
          <div className="p-4">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
