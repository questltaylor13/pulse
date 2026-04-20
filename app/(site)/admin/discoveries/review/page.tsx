import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveDiscovery, editDiscovery, rejectDiscovery } from "./actions";

// PRD 3 Phase 6 §6.4 — UNVERIFIED triage UI.
// Simple per-row Approve / Reject + inline Edit. Ritual cadence is weekly,
// 15 min after the Sunday cron run.

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) redirect("/");

  const pending = await prisma.discovery.findMany({
    where: { status: "UNVERIFIED" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">
          Unverified Discoveries
        </h1>
        <p className="text-sm text-slate-600">
          {pending.length === 0
            ? "Queue is clear. The Sunday run didn't surface anything needing review."
            : `${pending.length} Discoveries waiting for review. Approve keeps it in the public feed; Reject archives it; Edit lets you fix title or description inline.`}
        </p>
      </header>

      {pending.length === 0 ? null : (
        <ul className="space-y-4">
          {pending.map((gem) => (
            <li
              key={gem.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <form
                action={async (formData) => {
                  "use server";
                  await editDiscovery(formData);
                }}
                className="space-y-3"
              >
                <input type="hidden" name="id" value={gem.id} />

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {gem.sourceType}
                  </span>
                  <span>·</span>
                  <span>{gem.subtype}</span>
                  <span>·</span>
                  <span>{gem.category}</span>
                  <span>·</span>
                  <span>{gem.region}</span>
                  {gem.townName && (
                    <>
                      <span>·</span>
                      <span>{gem.townName}</span>
                    </>
                  )}
                  <span className="ml-auto">
                    Quality {gem.qualityScore}/10
                  </span>
                </div>

                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Title</span>
                  <input
                    type="text"
                    name="title"
                    defaultValue={gem.title}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-500">Description</span>
                  <textarea
                    name="description"
                    defaultValue={gem.description}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </label>

                {gem.sourceUrl && (
                  <a
                    href={gem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block break-all text-xs text-amber-700 hover:underline"
                  >
                    {gem.sourceUrl}
                  </a>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="submit"
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Save edit
                  </button>
                  <button
                    type="submit"
                    formAction={async () => {
                      "use server";
                      await approveDiscovery(gem.id);
                    }}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    formAction={async () => {
                      "use server";
                      await rejectDiscovery(gem.id);
                    }}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                  >
                    Reject
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
