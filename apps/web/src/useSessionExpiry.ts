import { useEffect, useLayoutEffect, useRef } from "react";

// The API event listener stays mounted while the identity changes after login.
export function useSessionExpiry(onExpired: () => void) {
  const current = useRef(onExpired);
  useLayoutEffect(() => {
    current.current = onExpired;
  });
  useEffect(() => {
    const expired = () => current.current();
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
}
