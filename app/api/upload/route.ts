import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

// Max file size: 4MB
const MAX_FILE_SIZE = 4 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if blob token is configured
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File uploads not configured. Please use a URL instead." },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "profile" or "cover"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4MB." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const extension = file.type.split("/")[1];
    const filename = `${type || "image"}-${session.user.id}-${Date.now()}.${extension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    // If this is a profile image, update the user and delete old image
    if (type === "profile") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { profileImageUrl: true },
      });

      // Delete old profile image from blob storage if it exists and is a blob URL
      if (user?.profileImageUrl?.includes("blob.vercel-storage.com")) {
        try {
          await del(user.profileImageUrl);
        } catch {
          // Ignore errors deleting old image
        }
      }

      // Update user with new profile image URL
      await prisma.user.update({
        where: { id: session.user.id },
        data: { profileImageUrl: blob.url },
      });
    }

    return NextResponse.json({
      url: blob.url,
      success: true,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// Delete an uploaded file
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File uploads not configured" },
      { status: 503 }
    );
  }

  try {
    const { url } = await request.json();

    if (!url || !url.includes("blob.vercel-storage.com")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    await del(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
