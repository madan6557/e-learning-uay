export function GradeScoreInput({
  value,
  onChange,
  disabled,
  className = "",
  ariaLabel,
}: {
  value: string | number;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      className={`score-input ${className}`.trim()}
      aria-label={ariaLabel}
      type="number"
      min={0}
      max={100}
      step="1"
      disabled={disabled}
      value={value}
      onKeyDown={(e) => {
        if (e.key === "-" || e.key === "e" || e.key === "E") {
          e.preventDefault();
        }
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onChange("");
          return;
        }
        const num = parseFloat(raw);
        if (isNaN(num)) {
          onChange("0");
        } else if (num > 100) {
          onChange("100");
        } else if (num < 0) {
          onChange("0");
        } else {
          onChange(raw);
        }
      }}
      onBlur={(e) => {
        const raw = e.target.value;
        if (raw !== "") {
          const num = Math.max(0, Math.min(100, parseFloat(raw) || 0));
          onChange(String(Math.round(num * 100) / 100));
        }
      }}
    />
  );
}
