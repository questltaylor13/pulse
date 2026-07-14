import { Category } from "@prisma/client";

export interface ScrapedEvent {
  title: string;
  description: string;
  category: Category;
  tags: string[];
  venueName: string;
  address: string;
  neighborhood?: string;
  startTime: Date;
  endTime?: Date;
  priceRange: string;
  source: string;
  sourceUrl?: string;
  externalId?: string;
  imageUrl?: string;
  /**
   * Wave 6A — human-readable recurrence, when the source actually states one
   * ("Every Sunday"). Westword parses this already and, until now, discarded it.
   * Presence of a cadence is one of the two grounds on which a series is asserted.
   */
  cadence?: string;
}

export interface ScraperResult {
  source: string;
  events: ScrapedEvent[];
  errors: string[];
}

export type Scraper = () => Promise<ScraperResult>;
