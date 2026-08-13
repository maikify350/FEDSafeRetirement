import { primaryButtonClasses, secondaryButtonClasses } from "./styles";

export function ActionButton({
  label,
  onClick,
  disabled,
  tone = "primary"
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        tone === "primary"
          ? `${primaryButtonClasses} disabled:cursor-not-allowed disabled:border-fed-blue/10 disabled:bg-slate-200 disabled:text-slate-400`
          : `${secondaryButtonClasses} disabled:cursor-not-allowed disabled:border-fed-blue/10 disabled:bg-slate-100 disabled:text-slate-400`
      }
    >
      {label}
    </button>
  );
}
