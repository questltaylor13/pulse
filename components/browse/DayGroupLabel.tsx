interface Props {
  label: string;
}

export default function DayGroupLabel({ label }: Props) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="shrink-0 text-meta font-semibold uppercase tracking-wider text-mute">
        {label}
      </span>
      <div className="h-px flex-1 bg-mute-divider" />
    </div>
  );
}
