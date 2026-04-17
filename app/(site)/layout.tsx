import { Suspense } from "react";
import Link from "next/link";
import AuthActions from "@/components/AuthActions";
import NavLinks from "@/components/NavLinks";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="text-lg font-semibold text-coral">
            Pulse
          </Link>
          <div className="flex items-center gap-1">
            <span className="mr-2 hidden rounded-full bg-coral/10 px-3 py-1 text-xs font-medium text-coral sm:inline-block">
              Denver beta
            </span>
            <Suspense fallback={null}>
              <NavLinks />
            </Suspense>
            <AuthActions />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container py-10">{children}</div>
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        Built for Denver
      </footer>
    </div>
  );
}
