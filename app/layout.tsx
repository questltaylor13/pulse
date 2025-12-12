import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import "./globals.css";
import { authOptions } from "@/lib/auth";
import AuthActions from "@/components/AuthActions";

export const metadata: Metadata = {
  title: "Pulse",
  description: "Discover the best events around Denver.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="container flex items-center justify-between py-4">
              <Link href="/" className="text-lg font-semibold text-primary">
                Pulse
              </Link>
              <AuthActions session={session} />
            </div>
          </header>
          <main className="flex-1">
            <div className="container py-10">{children}</div>
          </main>
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
            Built for Denver explorers — MVP setup
          </footer>
        </div>
      </body>
    </html>
  );
}
