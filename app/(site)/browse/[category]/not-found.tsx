import { redirect } from "next/navigation";

export default function BrowseNotFound() {
  redirect("/?notice=browse-unavailable");
}
