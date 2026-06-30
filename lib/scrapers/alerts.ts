export interface ScraperAnomaly {
  source: string;
  rawCount: number;
  /** The 14-day rolling median the source fell below. */
  median?: number;
}

/**
 * Notify when scraper sources show a coverage anomaly (rawCount collapsed
 * vs the 14-day median — including dropping to zero, the classic signal
 * that a newly-activated key returned nothing or a source's HTML changed).
 *
 * No-op unless SCRAPER_ALERT_WEBHOOK_URL is set (a Slack/Discord-style
 * incoming webhook). NEVER throws — alerting must not break the scrape.
 */
export async function sendScraperAlert(anomalies: ScraperAnomaly[]): Promise<void> {
  if (anomalies.length === 0) return;

  const summary = anomalies
    .map(
      (a) =>
        `• ${a.source} — rawCount ${a.rawCount}` +
        (a.median != null ? ` (14-day median ${a.median})` : ""),
    )
    .join("\n");
  const text = `:rotating_light: Pulse scraper coverage anomaly (${anomalies.length})\n${summary}\nReview /admin/scrapers.`;

  const webhook = process.env.SCRAPER_ALERT_WEBHOOK_URL;
  if (!webhook) {
    console.warn(
      `[scraper-alert] ${anomalies.length} anomaly(ies); set SCRAPER_ALERT_WEBHOOK_URL to deliver:\n${summary}`,
    );
    return;
  }

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("[scraper-alert] failed to post webhook:", err);
  }
}
