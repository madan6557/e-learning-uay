import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
type Confirmation = { message: string; resolve: (answer: boolean) => void };
let current: Confirmation | null = null;
const listeners = new Set<() => void>();
export function confirmAction(message: string): Promise<boolean> {
  // A second click must not open competing confirmation flows.
  if (current) return Promise.resolve(false);
  return new Promise((resolve) => {
    current = { message, resolve };
    listeners.forEach((listener) => listener());
  });
}
export function ConfirmationHost() {
  const request = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => current,
  );
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (request) ref.current?.showModal();
  }, [request]);
  const finish = (answer: boolean) => {
    const pending = current;
    current = null;
    listeners.forEach((listener) => listener());
    pending?.resolve(answer);
  };
  if (!request) return null;
  return createPortal(
    <dialog
      ref={ref}
      className="modal confirm-dialog"
      aria-labelledby="confirmation-title"
      onCancel={(event) => {
        event.preventDefault();
        finish(false);
      }}
    >
      <div className="modal-heading">
        <h2 id="confirmation-title">Konfirmasi tindakan</h2>
      </div>
      <div className="confirm-content">
        <p>{request.message}</p>
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            autoFocus
            onClick={() => finish(false)}
          >
            Batal
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => finish(true)}
          >
            Lanjutkan
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
