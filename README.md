# Pulse (MVP)

A Next.js + TypeScript starter for the Pulse events app. This initial setup includes Tailwind CSS, Prisma, and the PostgreSQL data model needed for onboarding, preferences, event feeds, and user lists.

## Getting started

### Prerequisites
- Node.js 18+
- Yarn or npm
- PostgreSQL database

### Installation
```bash
yarn install
```
> If your environment restricts package downloads, configure your registry or proxy settings accordingly before installing.

### Development server
```bash
yarn dev
```
The app runs at http://localhost:3000.

### Environment variables
Create a `.env` file based on `.env.example` with your database and auth secrets.
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - secret for NextAuth JWT/session signing

### Prisma
Generate the Prisma client and run migrations once your database is reachable.
```bash
yarn prisma:generate
yarn prisma:migrate --name init
```
To inspect data locally:
```bash
yarn prisma:studio
```

## Project structure
- `app/` - App Router pages and shared layout
- `prisma/schema.prisma` - database models and relations
- `prisma/migrations/` - initial SQL migration for the MVP schema
- `tailwind.config.ts` - Tailwind theme and content scanning paths

## Next steps
- Wire up authentication with NextAuth
- Build onboarding flow for city, relationship status, and interests
- Implement personalized event feeds and admin event management
