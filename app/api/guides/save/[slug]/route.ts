import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guide = await prisma.guide.findUnique({
    where: { slug: params.slug },
  });
  if (!guide) {
    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }

  await prisma.userSavedGuide.upsert({
    where: {
      userId_guideId: { userId: session.user.id, guideId: guide.id },
    },
    update: {},
    create: { userId: session.user.id, guideId: guide.id },
  });

  return NextResponse.json({ saved: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guide = await prisma.guide.findUnique({
    where: { slug: params.slug },
  });
  if (!guide) {
    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }

  await prisma.userSavedGuide.deleteMany({
    where: { userId: session.user.id, guideId: guide.id },
  });

  return NextResponse.json({ saved: false });
}
