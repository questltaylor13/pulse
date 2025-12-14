import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFriendshipStatus } from "@/lib/friends";

// GET /api/users/search - Search for users
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } }, // Exclude self
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      profileImageUrl: true,
    },
    take: 10,
  });

  // Get friendship status for each user
  const usersWithStatus = await Promise.all(
    users.map(async (user) => {
      const friendshipStatus = await getFriendshipStatus(session.user.id, user.id);
      return { ...user, friendshipStatus };
    })
  );

  return NextResponse.json({ users: usersWithStatus });
}
