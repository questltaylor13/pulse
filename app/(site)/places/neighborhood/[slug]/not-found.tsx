import { redirect } from "next/navigation";

export default function NeighborhoodNotFound() {
  redirect("/?tab=places&notice=neighborhood-unavailable");
}
