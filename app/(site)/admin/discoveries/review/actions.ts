"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized");
  }
}

export async function approveDiscovery(id: string) {
  await requireAdmin();
  await prisma.discovery.update({
    where: { id },
    data: { status: "ACTIVE", verifiedAt: new Date() },
  });
  revalidatePath("/admin/discoveries/review");
  revalidatePath("/discoveries");
}

export async function rejectDiscovery(id: string) {
  await requireAdmin();
  await prisma.discovery.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  revalidatePath("/admin/discoveries/review");
}

export async function editDiscovery(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!id || !title || !description) {
    throw new Error("Missing required fields");
  }
  await prisma.discovery.update({
    where: { id },
    data: { title, description },
  });
  revalidatePath("/admin/discoveries/review");
}
