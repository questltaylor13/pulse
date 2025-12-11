import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pulse",
  description: "Discover the best events around Denver.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="container flex items-center justify-between py-4">
              <Link href="/" className="text-lg font-semibold text-primary">
                Pulse
              </Link>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Denver beta</span>
                <Link
                  href="/auth/signin"
                  className="rounded-md px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Sign in
                </Link>
              </div>
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
