import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Notice } from "./components/ui/Notice";

type Feedback = { id: number; message: string; error?: boolean };
let nextId = 0;
export function notifyAction(message: string, error = false) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new window.CustomEvent<Feedback>("uay-feedback", {
        detail: { id: ++nextId, message, error },
      }),
    );
}

export function FeedbackHost() {
  const [messages, setMessages] = useState<Feedback[]>([]);
  const [dialog, setDialog] = useState<HTMLDialogElement | null>(null);
  useEffect(() => {
    // Native modal dialogs cover and make page-level feedback inert.
    const syncDialog = () => {
      const dialogs =
        document.querySelectorAll<HTMLDialogElement>("dialog[open]");
      setDialog(dialogs.item(dialogs.length - 1));
    };
    const observer = new window.MutationObserver(syncDialog);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    syncDialog();
    const timers = new Map<number, ReturnType<typeof setTimeout>>();
    const receive = (event: Event) => {
      syncDialog();
      const item = (event as CustomEvent<Feedback>).detail;
      setMessages((current) => [...current.slice(-2), item]);
      const duration = item.error ? 8000 : 5000;
      const timer = setTimeout(() => {
        setMessages((current) =>
          current.filter((message) => message.id !== item.id),
        );
        timers.delete(item.id);
      }, duration);
      timers.set(item.id, timer);
    };
    window.addEventListener("uay-feedback", receive);
    return () => {
      observer.disconnect();
      window.removeEventListener("uay-feedback", receive);
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);
  const host = (
    <div className="feedback-host" aria-label="Hasil tindakan">
      {messages.map((item) => (
        <div className="feedback-item" key={item.id}>
          <Notice
            error={item.error ? item.message : undefined}
            onClose={() =>
              setMessages((current) =>
                current.filter((message) => message.id !== item.id),
              )
            }
          >
            {item.message}
          </Notice>
        </div>
      ))}
    </div>
  );
  return dialog ? createPortal(host, dialog) : host;
}
