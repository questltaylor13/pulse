import Link from "next/link";
import type { Session } from "next-auth";
import SignOutButton from "@/components/SignOutButton";

export default function AuthActions({ session }: { session: Session | null }) {
  if (!session?.user) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Denver beta</span>
        <Link
          href="/auth/login"
          className="rounded-md px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Log in
        </Link>
      </div>
    );
  }

  const displayName = session.user.name || session.user.email;

  return (
    <div className="flex items-center gap-3 text-sm text-slate-700">
      <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Denver beta</span>
      <span className="font-medium text-slate-800">{displayName}</span>
      <SignOutButton />
    </div>
  );
}
