export function WorkflowStep({
  number,
  title,
  description,
  inverse = false
}: {
  number: string;
  title: string;
  description: string;
  inverse?: boolean;
}) {
  return (
    <div
      className={`flex gap-4 rounded-[1.35rem] p-4 ${
        inverse ? "border border-white/10 bg-white/5" : "border border-fed-blue/10 bg-white/70"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          inverse ? "bg-white/12 text-white" : "bg-fed-navy text-white"
        }`}
      >
        {number}
      </div>
      <div>
        <h3 className={`text-base font-semibold ${inverse ? "text-white" : "text-fed-navy"}`}>
          {title}
        </h3>
        <p className={`mt-1 text-sm leading-7 ${inverse ? "text-white/75" : "text-slate-600"}`}>
          {description}
        </p>
      </div>
    </div>
  );
}
