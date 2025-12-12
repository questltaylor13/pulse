import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/social/preview - Fetch TikTok/Instagram metadata from URL
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Detect platform
    let platform: "tiktok" | "instagram" | null = null;
    let authorHandle: string | null = null;

    if (url.includes("tiktok.com")) {
      platform = "tiktok";
      // Extract handle from TikTok URL: https://tiktok.com/@username/video/...
      const match = url.match(/tiktok\.com\/@([^\/]+)/);
      if (match) {
        authorHandle = match[1];
      }
    } else if (url.includes("instagram.com")) {
      platform = "instagram";
      // Extract from Instagram URL patterns
      // https://instagram.com/p/CODE or https://instagram.com/reel/CODE
      // The username isn't in these URLs, we'd need to fetch the page
    }

    if (!platform) {
      return NextResponse.json({ error: "Unsupported platform. Use TikTok or Instagram URLs." }, { status: 400 });
    }

    // For a production app, you'd use oEmbed APIs or scrape metadata
    // TikTok oEmbed: https://www.tiktok.com/oembed?url=VIDEO_URL
    // Instagram oEmbed: https://graph.facebook.com/v18.0/instagram_oembed?url=URL&access_token=TOKEN

    // For now, return basic info we can extract from the URL
    const preview = {
      platform,
      url,
      authorHandle,
      thumbnail: null as string | null,
      caption: null as string | null,
      embedUrl: url,
    };

    // Try to get TikTok oEmbed data (public API, no auth needed)
    if (platform === "tiktok") {
      try {
        const oembedResponse = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json();
          preview.thumbnail = oembedData.thumbnail_url || null;
          preview.caption = oembedData.title || null;
          preview.authorHandle = oembedData.author_name || authorHandle;
        }
      } catch {
        // oEmbed failed, continue with basic info
      }
    }

    return NextResponse.json({ preview });
  } catch {
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
