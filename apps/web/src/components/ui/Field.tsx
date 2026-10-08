import { useId, useState, isValidElement, cloneElement, type ReactNode, type ReactElement } from "react";

export interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, children, hint }: FieldProps) {
  const id = useId();
  const [validation, setValidation] = useState("");
  const control =
    isValidElement(children) &&
    typeof children.type === "string" &&
    ["input", "textarea", "select"].includes(children.type)
      ? cloneElement(children as ReactElement<any>, {
          "aria-labelledby": `${id}-label`,
          "aria-describedby":
            [hint && `${id}-hint`, validation && `${id}-error`]
              .filter(Boolean)
              .join(" ") || undefined,
          "aria-invalid": validation ? true : undefined,
          onInvalid: (event: any) =>
            setValidation(event.currentTarget.validationMessage),
          onInput: (event: any) => {
            setValidation("");
            (children.props as any).onInput?.(event);
          },
        })
      : children;

  return (
    <label className="field">
      <span id={`${id}-label`}>{label}</span>
      {control}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {validation && (
        <small className="danger-text" id={`${id}-error`} role="alert">
          {validation}
        </small>
      )}
    </label>
  );
}
