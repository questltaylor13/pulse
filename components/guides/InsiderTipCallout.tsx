interface Props {
  tip: string;
}

export default function InsiderTipCallout({ tip }: Props) {
  return (
    <div className="rounded-card bg-[#fef5e7] p-3">
      <p className="text-[13px] leading-relaxed text-ink">
        <span className="mr-1" aria-hidden="true">
          &#128161;
        </span>
        {tip}
      </p>
    </div>
  );
}
