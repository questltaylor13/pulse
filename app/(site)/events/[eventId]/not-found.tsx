import { redirect } from "next/navigation";

// Bug 2 fix: an invalid/removed event ID bounces the user back to the home
// feed with a notice query param (rendered by a small toast component).
export default function EventNotFound() {
  redirect("/?notice=event-unavailable");
}
