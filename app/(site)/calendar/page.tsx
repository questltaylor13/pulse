import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  CalendarView,
  PendingInvitations,
  CalendarSidebar,
} from "@/components/calendar";
import Link from "next/link";
import { Download, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "My Calendar | Pulse Denver",
  description: "Your events and plans in one place",
};

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/u/${session.user.username || session.user.id}`}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </Link>
          <h1 className="text-2xl font-bold">My Calendar</h1>
          <p className="text-gray-600">Your events and plans</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Pending Invitations Banner */}
      <PendingInvitations />

      <div className="flex gap-8">
        {/* Main Calendar */}
        <div className="flex-1">
          <CalendarView />
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <CalendarSidebar />
        </div>
      </div>
    </div>
  );
}
