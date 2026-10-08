import { useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Notice } from "./Notice";

export interface ActionProps {
  run: () => Promise<unknown>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label?: string;
}

export function Action({
  run,
  children,
  className = "secondary",
  disabled = false,
  label,
}: ActionProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || busy}
        aria-busy={busy}
        aria-label={label}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await run();
          } catch (e) {
            setError(e as Error);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
        {children}
      </button>
      {error && <Notice error={error} />}
    </>
  );
}
