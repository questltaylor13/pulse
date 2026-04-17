import { Category } from "@prisma/client";

/** One representative placeholder image per category (Unsplash, Denver/Colorado themed) */
export const CATEGORY_PLACEHOLDER_IMAGE: Record<Category, string> = {
  LIVE_MUSIC: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
  ART: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&q=80",
  FOOD: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
  RESTAURANT: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
  BARS: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80",
  COFFEE: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80",
  OUTDOORS: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
  FITNESS: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  SEASONAL: "https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&q=80",
  POPUP: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
  ACTIVITY_VENUE: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&q=80",
  OTHER: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
  COMEDY: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80",
  SOCIAL: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
  WELLNESS: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80",
};
