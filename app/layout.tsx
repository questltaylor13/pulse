import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Providers from "@/components/Providers";
import AuthActions from "@/components/AuthActions";
import NavLinks from "@/components/NavLinks";

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
        <Providers>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
              <div className="container flex items-center justify-between py-4">
                {/* Left: Logo only */}
                <Link href="/" className="text-lg font-semibold text-primary">
                  Pulse
                </Link>

                {/* Right: Navigation + Auth */}
                <div className="flex items-center gap-1">
                  <span className="hidden sm:inline-block rounded-full bg-primary/10 px-3 py-1 text-primary text-xs font-medium mr-2">
                    Denver beta
                  </span>
                  <NavLinks />
                  <AuthActions />
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
        </Providers>
      </body>
    </html>
  );
}
