import { redirect } from "next/navigation";

// Legacy /feed route now redirects to the new content-forward home.
// Preserved to protect external links.
export default function FeedRedirect() {
  redirect("/");
}
