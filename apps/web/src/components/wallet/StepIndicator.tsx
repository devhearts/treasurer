interface StepIndicatorProps {
  total: number;
  current: number;
}

export default function StepIndicator({ total, current }: StepIndicatorProps) {
  return (
    <div className="flex gap-1.5 items-center justify-center pt-3">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div
            key={step}
            className={`h-1.5 rounded-full transition-all ${
              active
                ? "w-[18px] bg-accent"
                : done
                  ? "w-1.5 bg-accent"
                  : "w-1.5 bg-muted/30"
            }`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
