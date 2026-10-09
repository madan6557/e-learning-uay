import { useEffect, useState } from "react";
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
  useEffect(() => {
    const timers = new Map<number, ReturnType<typeof setTimeout>>();
    const receive = (event: Event) => {
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
      window.removeEventListener("uay-feedback", receive);
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);
  return (
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
}
