# Pulse

Discover Denver's best events and places, personalized to your vibe.

Pulse is an AI-powered local discovery platform that helps Denver residents find events, restaurants, bars, outdoor activities, and hidden gems — tailored to their interests, schedule, and lifestyle preferences.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js (credentials provider)
- **Styling:** Tailwind CSS
- **AI:** OpenAI (event curation and enrichment)
- **Storage:** Vercel Blob
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Installation

```bash
npm install
```

### Database Setup

```bash
npx prisma generate
npx prisma migrate dev
```

### Development Server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/                  # Next.js App Router pages and API routes
  api/                # API endpoints (auth, feed, events, etc.)
  auth/               # Login and signup pages
  feed/               # Personalized event feed
  onboarding/         # 8-step user onboarding
components/           # React components
  landing/            # Landing page sections
  feed/               # Feed-specific components
lib/                  # Shared utilities and configuration
  auth.ts             # NextAuth configuration
  prisma.ts           # Prisma client
  scoring.ts          # Event scoring algorithm
  scrapers/           # Event scraping infrastructure
prisma/
  schema.prisma       # Database schema
scripts/              # Seed scripts and utilities
```

## Features

- **Personalized Feed:** AI-scored event recommendations based on user preferences
- **8-Step Onboarding:** Captures interests, schedule, budget, vibe, and lifestyle preferences
- **Category Filtering:** Browse by food, music, art, outdoors, nightlife, and more
- **Neighborhood Discovery:** Explore events by Denver neighborhood
- **Curator Dashboard:** Local tastemakers curate and highlight events
- **Community Features:** Badges, groups, leaderboards, and friend activity
- **Lists & Sharing:** Save events, create shareable lists, suggest to groups
- **Calendar Integration:** Add events to Google, Apple, or Outlook calendars
- **Dog-Friendly & Sober-Friendly Filters:** Lifestyle-aware recommendations

## Deployment

This project is configured for Vercel deployment:

```bash
npm run build    # Runs prisma generate + next build
```

Set your environment variables in the Vercel dashboard and deploy.
