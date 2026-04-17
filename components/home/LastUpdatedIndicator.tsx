interface Props {
  isoTimestamp: string;
}

function relativeHours(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (60 * 60 * 1000)));
}

export default function LastUpdatedIndicator({ isoTimestamp }: Props) {
  const hoursAgo = relativeHours(isoTimestamp);

  let text: string;
  if (hoursAgo > 24) {
    text = "No new spots today — check back tomorrow";
  } else if (hoursAgo < 1) {
    text = "Updated just now";
  } else if (hoursAgo === 1) {
    text = "Updated 1 hour ago";
  } else {
    text = `Updated ${hoursAgo} hours ago`;
  }

  return (
    <p className="px-5 pb-20 pt-6 text-center text-[12px] text-mute-soft">{text}</p>
  );
}
