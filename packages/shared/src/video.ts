export type VideoSource =
  | { kind: "youtube"; videoId: string; url: string }
  | { kind: "native"; url: string }
  | { kind: "unsupported"; url: string };

export function videoSource(value: string): VideoSource {
  try {
    const url = new URL(value);
    if (!["http:", "https:", "blob:"].includes(url.protocol))
      return { kind: "unsupported", url: value };
    const host = url.hostname.toLowerCase();
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
        "youtu.be",
        "www.youtu.be",
      ].includes(host)
    ) {
      const videoId = host.endsWith("youtu.be")
        ? url.pathname.split("/")[1]
        : /^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1] ||
          url.searchParams.get("v");
      return videoId && /^[\w-]{11}$/.test(videoId)
        ? {
            kind: "youtube",
            videoId,
            url: `https://www.youtube-nocookie.com/embed/${videoId}`,
          }
        : { kind: "unsupported", url: value };
    }
    if (host === "drive.google.com" || url.pathname.includes("/embed/"))
      return { kind: "unsupported", url: value };
    return { kind: "native", url: value };
  } catch {
    return { kind: "unsupported", url: value };
  }
}

export function validVideoDuration(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 36000;
}

export function formatVideoDuration(value: number): string {
  const seconds = Math.ceil(value);
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}:` : ""}${Math.floor(minutes / 60) ? String(minutes % 60).padStart(2, "0") : minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
