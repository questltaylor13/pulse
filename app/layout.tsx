import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: {
    default: "Pulse | Discover Denver",
    template: "%s | Pulse",
  },
  description:
    "Discover Denver's best events and places, personalized to your vibe. AI-powered recommendations from local tastemakers.",
  openGraph: {
    title: "Pulse | Discover Denver",
    description: "Discover Denver's best events and places, personalized to your vibe.",
    siteName: "Pulse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulse | Discover Denver",
    description: "Discover Denver's best events and places, personalized to your vibe.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} font-body min-h-screen bg-surface text-ink`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
