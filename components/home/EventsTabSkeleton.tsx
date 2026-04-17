export default function EventsTabSkeleton() {
  return (
    <div className="space-y-8 py-6">
      {[1, 2, 3].map((i) => (
        <section key={i} className="px-5">
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-mute-hush" />
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-[220px] w-[220px] shrink-0 animate-pulse rounded-card bg-mute-hush"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
