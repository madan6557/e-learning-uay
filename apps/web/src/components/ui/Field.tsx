import {
  createContext,
  useId,
  useState,
  isValidElement,
  cloneElement,
  Children,
  Fragment,
  type ReactNode,
  type ReactElement,
} from "react";

export const FieldContext = createContext<{
  controlId: string;
  labelId: string;
  describedBy?: string;
} | null>(null);

export interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, children, hint }: FieldProps) {
  const id = useId();
  const [validation, setValidation] = useState("");
  let controlId =
    (isValidElement(children) && (children.props as any).id) || `${id}-control`;
  const describedBy =
    [hint && `${id}-hint`, validation && `${id}-error`]
      .filter(Boolean)
      .join(" ") || undefined;
  let connected = false;
  const connect = (nodes: ReactNode): ReactNode =>
    Children.map(nodes, (child) => {
      if (!isValidElement(child)) return child;
      if (
        !connected &&
        typeof child.type === "string" &&
        ["input", "textarea", "select"].includes(child.type) &&
        (child.props as any).type !== "hidden"
      ) {
        connected = true;
        controlId = (child.props as any).id || controlId;
        return cloneElement(child as ReactElement<any>, {
          id: controlId,
          "aria-labelledby": `${id}-label`,
          "aria-describedby": describedBy,
          "aria-invalid": validation ? true : undefined,
          onInvalid: (event: any) =>
            setValidation(event.currentTarget.validationMessage),
          onInput: (event: any) => {
            setValidation("");
            (child.props as any).onInput?.(event);
          },
        });
      }
      const childProps = child.props as { children?: ReactNode };
      if (
        childProps.children &&
        (typeof child.type === "string" || child.type === Fragment)
      ) {
        return cloneElement(child as ReactElement<any>, {
          children: connect(childProps.children),
        });
      }
      return child;
    });
  const control = connect(children);

  return (
    <label className="field" htmlFor={controlId}>
      <span id={`${id}-label`}>{label}</span>
      <FieldContext.Provider
        value={{ controlId, labelId: `${id}-label`, describedBy }}
      >
        {control}
      </FieldContext.Provider>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {validation && (
        <small className="danger-text" id={`${id}-error`} role="alert">
          {validation}
        </small>
      )}
    </label>
  );
}
