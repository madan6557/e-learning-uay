import { useRef, useId, useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { confirmAction } from "../../confirm";
import labels from "../../../../../packages/shared/src/id.json";

export interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  fullScreen?: boolean;
  extraActions?: ReactNode;
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
  fullScreen = false,
  extraActions,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const close = async () => {
    if (
      ref.current?.querySelector('[data-dirty="true"]') &&
      !(await confirmAction(
        "Perubahan belum dikirim ke server. Tutup editor dan simpan draft di perangkat ini?",
      ))
    )
      return;
    onClose();
  };

  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    el.addEventListener("cancel", cancel);
    return () => el.removeEventListener("cancel", cancel);
  }, []);

  const modalClass = fullScreen ? "modal fullscreen" : wide ? "modal wide" : "modal";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={modalClass}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-scroll">
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            {extraActions}
            <button
              type="button"
              className="icon-button"
              onClick={close}
              aria-label={labels.close}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </dialog>
  );
}
