interface Props {
  title: string;
  description: string;
}

export default function EmptyTab({ title, description }: Props) {
  return (
    <div
      role="tabpanel"
      className="flex min-h-[50vh] flex-col items-center justify-center px-8 pb-24 text-center"
    >
      <h2 className="text-title font-medium text-ink">{title}</h2>
      <p className="mt-2 max-w-xs text-body text-mute">{description}</p>
    </div>
  );
}
