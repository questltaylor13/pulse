import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: { id: string };
}

// Share list with a user
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const list = await prisma.list.findUnique({ where: { id } });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const body = await request.json();
  const { userId, role = "VIEWER" } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const collaborator = await prisma.listCollaborator.upsert({
    where: { listId_userId: { listId: id, userId } },
    update: { role },
    create: { listId: id, userId, role },
  });

  return NextResponse.json({ success: true, collaborator });
}

// Remove collaborator
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const list = await prisma.list.findUnique({ where: { id } });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await prisma.listCollaborator.deleteMany({
    where: { listId: id, userId },
  });

  return NextResponse.json({ success: true });
}
