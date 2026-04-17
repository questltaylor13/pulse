import { redirect } from "next/navigation";

interface Props {
  params: { slug: string };
}

export default function CreatorRedirect({ params }: Props) {
  redirect(`/influencers/${params.slug}`);
}
