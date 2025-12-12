"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
      className="rounded-md px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
    >
      Log out
    </button>
  );
}
