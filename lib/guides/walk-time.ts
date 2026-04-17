interface WalkTimeResult {
  minutes: number;
  source: "google" | "estimate";
}

const R = 6371; // Earth radius in km

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function estimateWalkMinutes(straightLineKm: number): number {
  const urbanKm = straightLineKm * 1.4;
  const walkSpeedKmPerMin = 5 / 60; // 5 km/h
  return Math.round(urbanKm / walkSpeedKmPerMin);
}

export async function computeWalkTime(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<WalkTimeResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_DIRECTIONS_API_KEY;
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&mode=walking&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.routes?.[0]?.legs?.[0]?.duration?.value) {
          return { minutes: Math.round(data.routes[0].legs[0].duration.value / 60), source: "google" };
        }
      }
    } catch (err) {
      console.warn("[walk-time] Google Directions API failed, using estimate:", err);
    }
  }
  const km = haversineKm(fromLat, fromLng, toLat, toLng);
  return { minutes: estimateWalkMinutes(km), source: "estimate" };
}
