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
}

export interface ScraperResult {
  source: string;
  events: ScrapedEvent[];
  errors: string[];
}

export type Scraper = () => Promise<ScraperResult>;
