/**
 * Google Places API integration for fetching venue data
 */

// Denver city center coordinates
export const DENVER_CENTER = {
  lat: 39.7392,
  lng: -104.9903,
};

// Default search radius in meters (25km covers greater Denver area)
export const DEFAULT_RADIUS = 25000;

// Place types for different categories we care about
export const PLACE_TYPE_MAPPINGS = {
  restaurant: ["restaurant", "food"],
  bar: ["bar", "night_club"],
  coffee: ["cafe", "coffee_shop"],
  outdoors: ["park", "hiking_area", "tourist_attraction"],
  fitness: ["gym", "fitness_center", "yoga_studio"],
  art: ["art_gallery", "museum"],
  live_music: ["live_music_venue", "concert_hall"],
};

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types: string[];
  businessStatus?: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  googleMapsUrl: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types: string[];
  formattedPhoneNumber?: string;
  website?: string;
  openingHours?: {
    weekdayText: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  photos?: Array<{
    photoReference: string;
    width: number;
    height: number;
  }>;
  reviews?: Array<{
    authorName: string;
    rating: number;
    text: string;
    time: number;
  }>;
  vicinity?: string;
}

/**
 * Calculate a combined score based on rating and review count
 * Uses logarithmic scaling for review count to prevent
 * places with many reviews from dominating
 */
export function calculateCombinedScore(
  rating: number | null | undefined,
  reviewCount: number | null | undefined
): number | null {
  if (!rating || !reviewCount || reviewCount < 5) {
    return null;
  }
  // Score = rating * log10(reviewCount)
  // This gives weight to both rating quality and popularity
  return rating * Math.log10(reviewCount);
}

/**
 * Get the API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Search for places by text query
 */
export async function searchPlacesByText(
  query: string,
  options: {
    location?: { lat: number; lng: number };
    radius?: number;
    type?: string;
  } = {}
): Promise<PlaceSearchResult[]> {
  const apiKey = getApiKey();
  const location = options.location || DENVER_CENTER;
  const radius = options.radius || DEFAULT_RADIUS;

  const params = new URLSearchParams({
    query,
    location: `${location.lat},${location.lng}`,
    radius: radius.toString(),
    key: apiKey,
  });

  if (options.type) {
    params.append("type", options.type);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ""}`);
  }

  return (data.results || []).map((place: Record<string, unknown>) => ({
    placeId: place.place_id as string,
    name: place.name as string,
    address: place.formatted_address as string,
    lat: (place.geometry as { location: { lat: number; lng: number } }).location.lat,
    lng: (place.geometry as { location: { lat: number; lng: number } }).location.lng,
    rating: place.rating as number | undefined,
    userRatingsTotal: place.user_ratings_total as number | undefined,
    priceLevel: place.price_level as number | undefined,
    types: (place.types || []) as string[],
    businessStatus: place.business_status as string | undefined,
  }));
}

/**
 * Search for nearby places by type
 */
export async function searchNearbyPlaces(
  type: string,
  options: {
    location?: { lat: number; lng: number };
    radius?: number;
    keyword?: string;
  } = {}
): Promise<PlaceSearchResult[]> {
  const apiKey = getApiKey();
  const location = options.location || DENVER_CENTER;
  const radius = options.radius || DEFAULT_RADIUS;

  const params = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    radius: radius.toString(),
    type,
    key: apiKey,
  });

  if (options.keyword) {
    params.append("keyword", options.keyword);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ""}`);
  }

  return (data.results || []).map((place: Record<string, unknown>) => ({
    placeId: place.place_id as string,
    name: place.name as string,
    address: place.vicinity as string,
    lat: (place.geometry as { location: { lat: number; lng: number } }).location.lat,
    lng: (place.geometry as { location: { lat: number; lng: number } }).location.lng,
    rating: place.rating as number | undefined,
    userRatingsTotal: place.user_ratings_total as number | undefined,
    priceLevel: place.price_level as number | undefined,
    types: (place.types || []) as string[],
    businessStatus: place.business_status as string | undefined,
  }));
}

/**
 * Get detailed information about a place
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const apiKey = getApiKey();

  const fields = [
    "place_id",
    "name",
    "formatted_address",
    "geometry",
    "url",
    "rating",
    "user_ratings_total",
    "price_level",
    "type",
    "formatted_phone_number",
    "website",
    "opening_hours",
    "photos",
    "reviews",
    "vicinity",
  ].join(",");

  const params = new URLSearchParams({
    place_id: placeId,
    fields,
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ""}`);
  }

  const place = data.result;

  return {
    placeId: place.place_id,
    name: place.name,
    formattedAddress: place.formatted_address,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    googleMapsUrl: place.url,
    rating: place.rating,
    userRatingsTotal: place.user_ratings_total,
    priceLevel: place.price_level,
    types: place.types || [],
    formattedPhoneNumber: place.formatted_phone_number,
    website: place.website,
    openingHours: place.opening_hours
      ? {
          weekdayText: place.opening_hours.weekday_text || [],
          periods: place.opening_hours.periods,
        }
      : undefined,
    photos: place.photos?.map(
      (photo: { photo_reference: string; width: number; height: number }) => ({
        photoReference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
      })
    ),
    reviews: place.reviews?.map(
      (review: {
        author_name: string;
        rating: number;
        text: string;
        time: number;
      }) => ({
        authorName: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time,
      })
    ),
    vicinity: place.vicinity,
  };
}

/**
 * Get a photo URL from a photo reference
 */
export function getPhotoUrl(
  photoReference: string,
  maxWidth: number = 400
): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return "";

  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

/**
 * Extract neighborhood from address
 * Looks for Denver neighborhood names in the address string
 */
export function extractNeighborhood(address: string): string | null {
  const denverNeighborhoods = [
    "RiNo",
    "River North",
    "LoDo",
    "Lower Downtown",
    "LoHi",
    "Lower Highlands",
    "Highlands",
    "Capitol Hill",
    "Cap Hill",
    "Cherry Creek",
    "Wash Park",
    "Washington Park",
    "Five Points",
    "Baker",
    "South Broadway",
    "Santa Fe",
    "Golden Triangle",
    "Uptown",
    "City Park",
    "Park Hill",
    "Stapleton",
    "Central Park",
    "Platt Park",
    "Sloan's Lake",
    "Sloans Lake",
    "Berkeley",
    "Tennyson",
    "Sunnyside",
    "West Highlands",
    "Jefferson Park",
    "Lakewood",
    "Aurora",
    "Englewood",
    "Littleton",
    "Westminster",
    "Arvada",
    "Edgewater",
    "Wheat Ridge",
    "Glendale",
    "Commerce City",
  ];

  for (const neighborhood of denverNeighborhoods) {
    if (address.toLowerCase().includes(neighborhood.toLowerCase())) {
      // Return normalized name
      const normalizations: Record<string, string> = {
        "river north": "RiNo",
        "lower downtown": "LoDo",
        "lower highlands": "LoHi",
        "cap hill": "Capitol Hill",
        "wash park": "Washington Park",
        "south broadway": "SoBo",
        "sloans lake": "Sloan's Lake",
        "central park": "Central Park",
      };
      return normalizations[neighborhood.toLowerCase()] || neighborhood;
    }
  }

  return null;
}

/**
 * Fetch all pages of results for a search
 * Google Places API returns up to 60 results across 3 pages
 */
export async function searchPlacesAllPages(
  query: string,
  options: {
    location?: { lat: number; lng: number };
    radius?: number;
    type?: string;
    maxPages?: number;
  } = {}
): Promise<PlaceSearchResult[]> {
  const apiKey = getApiKey();
  const location = options.location || DENVER_CENTER;
  const radius = options.radius || DEFAULT_RADIUS;
  const maxPages = options.maxPages || 3;

  const results: PlaceSearchResult[] = [];
  let nextPageToken: string | undefined;
  let page = 0;

  do {
    const params = new URLSearchParams({
      query,
      location: `${location.lat},${location.lng}`,
      radius: radius.toString(),
      key: apiKey,
    });

    if (options.type) {
      params.append("type", options.type);
    }

    if (nextPageToken) {
      params.append("pagetoken", nextPageToken);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
    );

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      // INVALID_REQUEST can occur when page token is not ready yet
      if (data.status === "INVALID_REQUEST" && nextPageToken) {
        // Wait a bit and retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ""}`);
    }

    const pageResults = (data.results || []).map((place: Record<string, unknown>) => ({
      placeId: place.place_id as string,
      name: place.name as string,
      address: place.formatted_address as string,
      lat: (place.geometry as { location: { lat: number; lng: number } }).location.lat,
      lng: (place.geometry as { location: { lat: number; lng: number } }).location.lng,
      rating: place.rating as number | undefined,
      userRatingsTotal: place.user_ratings_total as number | undefined,
      priceLevel: place.price_level as number | undefined,
      types: (place.types || []) as string[],
      businessStatus: place.business_status as string | undefined,
    }));

    results.push(...pageResults);
    nextPageToken = data.next_page_token;
    page++;

    // Google requires a short delay before using the next page token
    if (nextPageToken && page < maxPages) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } while (nextPageToken && page < maxPages);

  return results;
}
