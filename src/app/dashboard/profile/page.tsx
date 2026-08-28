"use client";

import { useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui";
import { ProfileOverview } from "@/features/accounts/profile-overview";

export default function ProfilePage() {
  const { account } = useAuth();
  if (!account) {
    return (
      <div className="grid place-items-center py-20 text-on-surface-variant">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }
  return <ProfileOverview account={account} />;
}
