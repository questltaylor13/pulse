import { redirect } from "next/navigation";

/**
 * Suggestions page — redirects to the main feed which shows suggestions.
 * Full suggestions UI is embedded in the feed via SuggestedSection.
 */
export default function SuggestionsPage() {
  redirect("/feed");
}
