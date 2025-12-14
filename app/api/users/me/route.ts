import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get current user's profile for editing
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      profileImageUrl: true,
      denverTenure: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// Update current user's profile
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, bio, username, profileImageUrl, denverTenure } = body;

  // Validate username if provided and changed
  if (username) {
    // Check format
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters, lowercase letters, numbers, and underscores only" },
        { status: 400 }
      );
    }

    // Check if username is taken by another user
    const existing = await prisma.user.findUnique({
      where: { username },
    });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }
  }

  // Validate denverTenure if provided
  const validTenures = ["NEW_TO_DENVER", "ONE_TO_TWO_YEARS", "TWO_TO_FIVE_YEARS", "FIVE_PLUS_YEARS"];
  if (denverTenure && !validTenures.includes(denverTenure)) {
    return NextResponse.json({ error: "Invalid Denver tenure value" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined && { name }),
      ...(bio !== undefined && { bio }),
      ...(username && { username }),
      ...(profileImageUrl !== undefined && { profileImageUrl }),
      ...(denverTenure && { denverTenure }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      profileImageUrl: true,
      denverTenure: true,
    },
  });

  return NextResponse.json(updated);
}
