import { redirect } from "next/navigation";

// Bug 2 fix: an invalid/removed place ID bounces the user back to the home
// feed with a notice query param.
export default function PlaceNotFound() {
  redirect("/?notice=place-unavailable");
}
