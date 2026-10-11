/**
 * Client-side media metadata auto-detection
 * Extracts PDF total pages, video duration, and image dimensions
 * directly from browser File objects to eliminate manual metadata entry.
 */

export async function detectPdfPages(file: File): Promise<number | undefined> {
  if (
    !file.type.includes("pdf") &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return undefined;
  }
  try {
    const pdf = await import("pdfjs-dist");
    pdf.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).href;
    const arrayBuffer = await file.arrayBuffer();
    const doc = await pdf.getDocument({
      data: arrayBuffer,
      isEvalSupported: false,
    }).promise;
    if (doc.numPages > 0) {
      return doc.numPages;
    }
  } catch (err) {
    console.warn("pdfjs-dist detection fallback:", err);
  }

  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder("latin1").decode(buffer);
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    if (matches && matches.length > 0) {
      return matches.length;
    }
    const countMatch = text.match(/\/Count\s+(\d+)/);
    if (countMatch && countMatch[1]) {
      const parsed = parseInt(countMatch[1], 10);
      if (parsed > 0) return parsed;
    }
  } catch {
    // ignore
  }

  return undefined;
}

export function detectVideoDuration(file: File): Promise<number | undefined> {
  if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|ogg)$/i.test(file.name)) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      const url = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (Number.isFinite(video.duration) && video.duration > 0) {
          resolve(Math.round(video.duration));
        } else {
          resolve(undefined);
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      video.src = url;
    } catch {
      resolve(undefined);
    }
  });
}

export function detectImageMetadata(
  file: File,
): Promise<{ width: number; height: number } | undefined> {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      img.src = url;
    } catch {
      resolve(undefined);
    }
  });
}
