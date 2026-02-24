"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ItemStatus, ItemType, Category } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ============================================================================
// Item Status Actions (WANT / DONE / PASS)
// ============================================================================

/**
 * Set item status (WANT, DONE, or PASS)
 * - Setting PASS removes WANT status
 * - Setting DONE or WANT removes PASS status
 */
export async function setItemStatus(itemId: string, status: ItemStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify item exists
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  // Upsert the status
  await prisma.userItemStatus.upsert({
    where: {
      userId_itemId: {
        userId: session.user.id,
        itemId,
      },
    },
    update: { status },
    create: {
      userId: session.user.id,
      itemId,
      status,
    },
  });

  revalidatePath("/feed");
  revalidatePath("/places");
  revalidatePath(`/items/${itemId}`);
  revalidatePath("/lists");

  return { success: true };
}

/**
 * Remove item status (neither WANT, DONE, nor PASS)
 */
export async function removeItemStatus(itemId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.userItemStatus.deleteMany({
    where: {
      userId: session.user.id,
      itemId,
    },
  });

  revalidatePath("/feed");
  revalidatePath("/places");
  revalidatePath(`/items/${itemId}`);
  revalidatePath("/lists");

  return { success: true };
}

/**
 * Get item status for current user
 */
export async function getItemStatus(itemId: string): Promise<ItemStatus | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const status = await prisma.userItemStatus.findUnique({
    where: {
      userId_itemId: {
        userId: session.user.id,
        itemId,
      },
    },
    select: { status: true },
  });

  return status?.status || null;
}

/**
 * Get item statuses for multiple items
 */
export async function getItemStatuses(
  itemIds: string[]
): Promise<Record<string, ItemStatus>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {};
  }

  const statuses = await prisma.userItemStatus.findMany({
    where: {
      userId: session.user.id,
      itemId: { in: itemIds },
    },
    select: { itemId: true, status: true },
  });

  return Object.fromEntries(statuses.map((s) => [s.itemId, s.status]));
}

/**
 * Get user's items by status (WANT, DONE, or PASS)
 */
export async function getUserItemsByStatus(status: ItemStatus, itemType?: ItemType) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const where: any = {
    userId: session.user.id,
    status,
  };

  if (itemType) {
    where.item = { type: itemType };
  }

  const items = await prisma.userItemStatus.findMany({
    where,
    include: {
      item: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return items;
}

// ============================================================================
// Place-aware Status Actions (bridge Place -> Item -> UserItemStatus)
// ============================================================================

/**
 * Set status for a Place by bridging through an Item record.
 * Finds or creates a lightweight Item that links to the Place by name+address,
 * then upserts UserItemStatus on that Item.
 */
export async function setPlaceStatus(placeId: string, status: ItemStatus) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Fetch the Place record
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { name: true, address: true, category: true, neighborhood: true, citySlug: true },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  // Find the city for this place
  const city = await prisma.city.findUnique({
    where: { slug: place.citySlug },
    select: { id: true },
  });

  if (!city) {
    throw new Error("City not found");
  }

  // Find or create a bridging Item record
  let item = await prisma.item.findFirst({
    where: {
      type: "PLACE",
      venueName: place.name,
      address: place.address,
      cityId: city.id,
    },
    select: { id: true },
  });

  if (!item) {
    item = await prisma.item.create({
      data: {
        type: "PLACE",
        cityId: city.id,
        title: place.name,
        description: "",
        category: place.category || "RESTAURANT",
        tags: [],
        venueName: place.name,
        address: place.address,
        priceRange: "",
        source: "place-bridge",
        neighborhood: place.neighborhood,
      },
      select: { id: true },
    });
  }

  // Upsert UserItemStatus on the bridging Item
  await prisma.userItemStatus.upsert({
    where: {
      userId_itemId: {
        userId: session.user.id,
        itemId: item.id,
      },
    },
    update: { status },
    create: {
      userId: session.user.id,
      itemId: item.id,
      status,
    },
  });

  revalidatePath("/feed");
  revalidatePath("/places");
  revalidatePath(`/places/${placeId}`);
  revalidatePath("/lists");

  return { success: true };
}

/**
 * Remove status for a Place by finding the bridging Item and deleting the UserItemStatus.
 */
export async function removePlaceStatus(placeId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { name: true, address: true, citySlug: true },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  const city = await prisma.city.findUnique({
    where: { slug: place.citySlug },
    select: { id: true },
  });

  if (!city) {
    throw new Error("City not found");
  }

  const item = await prisma.item.findFirst({
    where: {
      type: "PLACE",
      venueName: place.name,
      address: place.address,
      cityId: city.id,
    },
    select: { id: true },
  });

  if (item) {
    await prisma.userItemStatus.deleteMany({
      where: {
        userId: session.user.id,
        itemId: item.id,
      },
    });
  }

  revalidatePath("/feed");
  revalidatePath("/places");
  revalidatePath(`/places/${placeId}`);
  revalidatePath("/lists");

  return { success: true };
}

// ============================================================================
// Rating Actions
// ============================================================================

/**
 * Rate an item (1-5 stars)
 * Rating an item also sets status to DONE if not already
 */
export async function rateItem(
  itemId: string,
  rating: number,
  notes?: string,
  setDone: boolean = true
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  // Verify item exists
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true },
  });

  if (!item) {
    throw new Error("Item not found");
  }

  // Upsert rating
  await prisma.userItemRating.upsert({
    where: {
      userId_itemId: {
        userId: session.user.id,
        itemId,
      },
    },
    update: { rating, notes },
    create: {
      userId: session.user.id,
      itemId,
      rating,
      notes,
    },
  });

  // If setDone is true and status is not already DONE, set it
  if (setDone) {
    const currentStatus = await prisma.userItemStatus.findUnique({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId,
        },
      },
    });

    if (!currentStatus || currentStatus.status !== "DONE") {
      await prisma.userItemStatus.upsert({
        where: {
          userId_itemId: {
            userId: session.user.id,
            itemId,
          },
        },
        update: { status: "DONE" },
        create: {
          userId: session.user.id,
          itemId,
          status: "DONE",
        },
      });
    }
  }

  revalidatePath("/feed");
  revalidatePath("/places");
  revalidatePath(`/items/${itemId}`);
  revalidatePath("/lists");

  return { success: true };
}

/**
 * Get user's rating for an item
 */
export async function getItemRating(
  itemId: string
): Promise<{ rating: number; notes: string | null } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const rating = await prisma.userItemRating.findUnique({
    where: {
      userId_itemId: {
        userId: session.user.id,
        itemId,
      },
    },
    select: { rating: true, notes: true },
  });

  return rating;
}

/**
 * Remove rating for an item
 */
export async function removeItemRating(itemId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.userItemRating.deleteMany({
    where: {
      userId: session.user.id,
      itemId,
    },
  });

  revalidatePath(`/items/${itemId}`);
  revalidatePath("/lists");

  return { success: true };
}

// ============================================================================
// "Compared to your past" Insights
// ============================================================================

interface CategoryInsight {
  category: Category;
  averageRating: number;
  ratingCount: number;
}

/**
 * Get user's average ratings by category
 */
export async function getCategoryAverages(): Promise<CategoryInsight[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return [];
  }

  const ratings = await prisma.userItemRating.findMany({
    where: { userId: session.user.id },
    include: {
      item: { select: { category: true } },
    },
  });

  // Group by category
  const categoryRatings = new Map<Category, number[]>();
  for (const r of ratings) {
    const cat = r.item.category;
    if (!categoryRatings.has(cat)) {
      categoryRatings.set(cat, []);
    }
    categoryRatings.get(cat)!.push(r.rating);
  }

  // Calculate averages
  const insights: CategoryInsight[] = [];
  for (const [category, catRatings] of categoryRatings) {
    const sum = catRatings.reduce((a, b) => a + b, 0);
    insights.push({
      category,
      averageRating: sum / catRatings.length,
      ratingCount: catRatings.length,
    });
  }

  return insights.sort((a, b) => b.ratingCount - a.ratingCount);
}

/**
 * Get comparison insight for an item
 * Returns how this category/tags compare to user's past ratings
 */
export async function getComparisonInsight(itemId: string): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { category: true, tags: true },
  });

  if (!item) return null;

  // Get user's ratings for this category
  const categoryRatings = await prisma.userItemRating.findMany({
    where: {
      userId: session.user.id,
      item: { category: item.category },
    },
    select: { rating: true },
  });

  if (categoryRatings.length < 2) {
    return null; // Not enough data
  }

  const avgRating =
    categoryRatings.reduce((sum, r) => sum + r.rating, 0) / categoryRatings.length;
  const categoryName = item.category.replace(/_/g, " ").toLowerCase();

  return `Your average rating for ${categoryName}: ${avgRating.toFixed(1)} stars (${categoryRatings.length} rated)`;
}

// ============================================================================
// Item View Tracking
// ============================================================================

/**
 * Record an item view (deduped within 1 hour)
 */
export async function recordItemView(itemId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return;
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Check for recent view
  const recentView = await prisma.itemView.findFirst({
    where: {
      userId: session.user.id,
      itemId,
      createdAt: { gt: oneHourAgo },
    },
  });

  if (!recentView) {
    await prisma.itemView.create({
      data: {
        userId: session.user.id,
        itemId,
      },
    });
  }
}

// ============================================================================
// Get Item Details
// ============================================================================

/**
 * Get a single item with user's status and rating
 */
export async function getItemWithUserData(itemId: string) {
  const session = await getServerSession(authOptions);

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      city: { select: { name: true, slug: true } },
    },
  });

  if (!item) return null;

  let status: ItemStatus | null = null;
  let rating: { rating: number; notes: string | null } | null = null;
  let comparisonInsight: string | null = null;

  if (session?.user?.id) {
    const userStatus = await prisma.userItemStatus.findUnique({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId,
        },
      },
    });
    status = userStatus?.status || null;

    const userRating = await prisma.userItemRating.findUnique({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId,
        },
      },
    });
    rating = userRating ? { rating: userRating.rating, notes: userRating.notes } : null;

    comparisonInsight = await getComparisonInsight(itemId);
  }

  return {
    ...item,
    status,
    rating,
    comparisonInsight,
  };
}
