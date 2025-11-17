type StepperProps = {
  step: number;
  total: number;
};

export function OnboardingStepper({ step, total }: StepperProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/60">
      {Array.from({ length: total }).map((_, index) => {
        const active = index + 1 === step;
        return <span key={index} className={`h-2 w-10 rounded-full ${active ? 'bg-white' : 'bg-white/20'}`} />;
      })}
      <span className="ml-2 text-xs uppercase tracking-[0.3em]">Step {step} / {total}</span>
    </div>
  );
}
