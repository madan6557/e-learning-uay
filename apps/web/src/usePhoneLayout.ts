import { useEffect, useState } from "react";

/** Match the phone layout without remounting business state or local drafts. */
export function usePhoneLayout() {
  const [phone, setPhone] = useState(() =>
    typeof matchMedia === "function"
      ? matchMedia("(max-width: 600px)").matches
      : false,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const media = matchMedia("(max-width: 600px)");
    const update = () => setPhone(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return phone;
}
