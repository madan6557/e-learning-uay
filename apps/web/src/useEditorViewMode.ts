import { useEffect, useState } from "react";

type EditorViewMode = "split" | "edit" | "preview";

export function useEditorViewMode() {
  const [canSplit, setCanSplit] = useState(
    () => matchMedia("(min-width:1025px)").matches,
  );
  const [mode, setMode] = useState<EditorViewMode>(canSplit ? "split" : "edit");
  useEffect(() => {
    const media = matchMedia("(min-width:1025px)");
    const update = () => {
      setCanSplit(media.matches);
      if (!media.matches)
        setMode((value) => (value === "split" ? "edit" : value));
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return {
    viewMode: !canSplit && mode === "split" ? ("edit" as const) : mode,
    setViewMode: setMode,
    canSplit,
  };
}
