import {
  useState,
  useRef,
  useContext,
  useLayoutEffect,
  useEffect,
  type ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "../../ui";
import {
  useLocalDraft,
  SaveStatus,
  DraftRouteContext,
} from "../../useLocalDraft";
import { confirmAction } from "../../confirm";
import { Notice } from "./Notice";
import { notifyAction } from "../../feedback";
import labels from "../../../../../packages/shared/src/id.json";

export type FormSnapshot = Record<string, string[]>;

export function captureForm(form: HTMLFormElement): FormSnapshot {
  const values: FormSnapshot = {};
  for (const control of Array.from(form.elements) as HTMLInputElement[]) {
    if (
      !control.name ||
      ["file", "password", "submit", "button"].includes(control.type) ||
      control.name === "key"
    )
      continue;
    values[control.name] ??= [];
    if (["checkbox", "radio"].includes(control.type) && !control.checked)
      continue;
    values[control.name].push(control.value);
  }
  return values;
}

export function restoreForm(form: HTMLFormElement, values: FormSnapshot) {
  for (const control of Array.from(form.elements) as HTMLInputElement[]) {
    if (
      !control.name ||
      !(control.name in values) ||
      ["file", "password"].includes(control.type)
    )
      continue;
    const value = values[control.name];
    if (["checkbox", "radio"].includes(control.type))
      control.checked = value.includes(control.value);
    else {
      const prototype =
        control instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : control instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
        control,
        value[0] ?? "",
      );
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

export interface FormProps {
  onSubmit: (
    form: FormData,
    intent: "save" | "publish" | "draft",
  ) => Promise<unknown>;
  children: ReactNode;
  submitLabel?: string;
  successMessage?: string;
  busyLabel?: string;
  disabledReason?: string;
  onCancel?: () => void;
  draftKey?: string;
  draftValue?: any;
  draftVersion?: string;
  onRestoreDraft?: (value: any) => void;
  autosave?: boolean;
  disabled?: boolean;
  submitDisabled?: boolean;
  captureFields?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  publication?: {
    published: boolean;
    onUnpublish?: () => Promise<unknown>;
  };
  showInlineError?: boolean;
}

export function Form({
  onSubmit,
  children,
  submitLabel = "Simpan semua perubahan",
  successMessage = "Perubahan berhasil disimpan.",
  busyLabel,
  disabledReason,
  onCancel,
  draftKey = "form",
  draftValue,
  draftVersion,
  onRestoreDraft,
  autosave = true,
  disabled = false,
  submitDisabled = false,
  captureFields = true,
  onDirtyChange,
  publication,
  showInlineError = false,
}: FormProps) {
  const [busy, setBusy] = useState(false);
  const [isPublished, setIsPublished] = useState(publication?.published ?? false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const userInteractedRef = useRef(false);

  const markUserEdited = () => {
    if (!userInteractedRef.current) {
      userInteractedRef.current = true;
      setHasUserEdited(true);
    }
  };

  const ref = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    setIsPublished(publication?.published ?? false);
  }, [publication?.published]);
  const [fields, setFields] = useState<FormSnapshot>({});
  const draftRoute = useContext(DraftRouteContext);
  const draft = useLocalDraft(
    (draftRoute || "#" + location.pathname + location.search) + ":" + draftKey,
    { fields, extra: draftValue },
    (stored) => {
      userInteractedRef.current = true;
      setHasUserEdited(true);
      onRestoreDraft?.(stored.extra);
      setFields(stored.fields ?? {});
      // Restore named fields after React has rebuilt any dynamic sections.
      setTimeout(() => {
        if (ref.current) restoreForm(ref.current, stored.fields ?? {});
      }, 0);
    },
    autosave,
    draftVersion,
  );

  useLayoutEffect(() => {
    if (!captureFields || !ref.current) return;
    const initialFields = captureForm(ref.current);
    setFields(initialFields);
    if (!userInteractedRef.current) {
      draft.initialize({ fields: initialFields, extra: draftValue });
    }
  }, [captureFields, draftValue]);

  const isFormDirty = hasUserEdited && draft.dirty;

  useEffect(() => {
    onDirtyChange?.(isFormDirty);
  }, [isFormDirty, draft.recovery, onDirtyChange]);

  return (
    <form
      ref={ref}
      data-dirty={isFormDirty ? "true" : undefined}
      aria-busy={busy}
      onInput={markUserEdited}
      onChange={() => {
        markUserEdited();
        if (ref.current && captureFields) setFields(captureForm(ref.current));
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (inFlight.current || busy || disabled || submitDisabled) return;
        inFlight.current = true;
        const data = new FormData(e.currentTarget);
        const submitter = (e.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        const intent = publication
          ? submitter?.value === "draft"
            ? "draft"
            : "publish"
          : "save";
        setBusy(true);
        setPendingAction(intent);
        setError(null);
        try {
          const result = await onSubmit(data, intent);
          if (result !== false) {
            if (successMessage)
              notifyAction(
                publication
                  ? intent === "draft"
                    ? "Draf berhasil disimpan."
                    : "Konten berhasil diterbitkan."
                  : successMessage,
              );
            await new Promise((resolve) => setTimeout(resolve, 0));
            await draft.saved();
            userInteractedRef.current = false;
            setHasUserEdited(false);
            if (publication)
              window.dispatchEvent(new Event("notifications-changed"));
          }
        } catch (error) {
          const err = error as Error;
          setError(err);
          notifyAction(err.message || "Gagal menyimpan perubahan.", true);
        } finally {
          setBusy(false);
          inFlight.current = false;
          setPendingAction(null);
        }
      }}
    >
      {autosave && <SaveStatus draft={draft} busy={busy} />}
      <fieldset disabled={busy || disabled}>{children}</fieldset>
      {showInlineError && error && (
        <Notice error={error} onClose={() => setError(null)} />
      )}
      {(disabled || submitDisabled) && disabledReason && (
        <p className="action-reason">{disabledReason}</p>
      )}
      <div
        className={`form-actions sticky-actions${publication ? " publication-actions" : ""}`}
      >
        {onCancel && (
          <Button
            disabled={busy}
            onClick={async () => {
              if (
                !isFormDirty ||
                (await confirmAction(
                  "Tutup editor? Draft perubahan tetap tersedia di perangkat ini.",
                ))
              )
                onCancel();
            }}
          >
            {labels.cancel}
          </Button>
        )}
        <Button
          type="submit"
          value={publication ? "publish" : "save"}
          variant="primary"
          disabled={busy || disabled || submitDisabled}
        >
          {busy &&
          pendingAction !== "draft" &&
          pendingAction !== "unpublish" ? (
            <>
              <LoaderCircle size={16} className="spin" />
              {busyLabel ?? labels.saving}
            </>
          ) : publication ? (
            "Simpan dan Publikasikan"
          ) : (
            submitLabel
          )}
        </Button>
        {publication && (
          <Button
            type={
              isPublished && publication.onUnpublish
                ? "button"
                : "submit"
            }
            value="draft"
            disabled={busy || disabled || submitDisabled}
            onClick={
              isPublished && publication.onUnpublish
                ? async () => {
                    if (inFlight.current || busy || disabled || submitDisabled)
                      return;
                    inFlight.current = true;
                    setBusy(true);
                    setPendingAction("unpublish");
                    setError(null);
                    try {
                      const result = await publication.onUnpublish!();
                      setIsPublished(false);
                      if (result !== false)
                        notifyAction("Publikasi berhasil ditarik.");
                      window.dispatchEvent(new Event("notifications-changed"));
                    } catch (error) {
                      setError(error as Error);
                    } finally {
                      inFlight.current = false;
                      setBusy(false);
                      setPendingAction(null);
                    }
                  }
                : undefined
            }
          >
            {busy &&
            (pendingAction === "draft" || pendingAction === "unpublish") ? (
              <>
                <LoaderCircle size={16} className="spin" />
                {busyLabel ?? labels.saving}
              </>
            ) : isPublished && publication.onUnpublish ? (
              "Tarik Publikasi"
            ) : (
              "Simpan Sebagai Draf"
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
