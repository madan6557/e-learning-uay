import {
  useId,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { LoaderCircle } from "lucide-react";
import { Notice } from "./Notice";
import { notifyAction } from "../../feedback";

export interface ActionProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "children"
> {
  run: () => Promise<unknown>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label?: string;
  successMessage?: string;
  busyLabel?: string;
  disabledReason?: string;
  inlineError?: boolean;
}

export function Action({
  run,
  children,
  className = "secondary",
  disabled = false,
  label,
  successMessage,
  busyLabel,
  disabledReason,
  inlineError = false,
  ...buttonProps
}: ActionProps) {
  const inFlight = useRef(false);
  const reasonId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return (
    <>
      <button
        {...buttonProps}
        type="button"
        className={`${className}${error ? " action-has-error" : ""}`.trim()}
        disabled={disabled || busy}
        aria-busy={busy}
        aria-label={label ?? buttonProps["aria-label"]}
        title={
          error
            ? error.message
            : disabled && disabledReason
              ? disabledReason
              : buttonProps.title
        }
        aria-describedby={
          disabled && disabledReason
            ? reasonId
            : buttonProps["aria-describedby"]
        }
        onClick={async () => {
          if (inFlight.current || disabled) return;
          inFlight.current = true;
          setBusy(true);
          setError(null);
          try {
            const result = await run();
            if (result !== false && successMessage)
              notifyAction(successMessage);
          } catch (e) {
            const err = e as Error;
            setError(err);
            notifyAction(err.message || "Tindakan gagal dilakukan.", true);
          } finally {
            setBusy(false);
            inFlight.current = false;
          }
        }}
      >
        {busy && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
        {busy && busyLabel ? busyLabel : children}
      </button>
      {inlineError && error && (
        <Notice error={error} onClose={() => setError(null)} />
      )}
      {disabled && disabledReason && (
        <small id={reasonId} className="action-reason">
          {disabledReason}
        </small>
      )}
    </>
  );
}
