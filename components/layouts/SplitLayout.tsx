"use client";

interface SplitLayoutProps {
  main: React.ReactNode;
  sidebar: React.ReactNode;
  sidebarPosition?: "left" | "right";
}

export default function SplitLayout({
  main,
  sidebar,
  sidebarPosition = "right",
}: SplitLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {sidebarPosition === "left" && (
          <aside className="hidden lg:block lg:w-1/3">
            <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto space-y-6 scrollbar-hide">
              {sidebar}
            </div>
          </aside>
        )}

        <main className="flex-1 lg:w-2/3">{main}</main>

        {sidebarPosition === "right" && (
          <aside className="hidden lg:block lg:w-1/3">
            <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto space-y-6 scrollbar-hide">
              {sidebar}
            </div>
          </aside>
        )}
      </div>

      {/* Mobile: Show sidebar content below main */}
      <div className="lg:hidden mt-8 space-y-6">{sidebar}</div>
    </div>
  );
}
