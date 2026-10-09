import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Action } from "./ui/Action";
import { VideoPlayer } from "./VideoPlayer";
import {
  formatVideoDuration,
  videoSource,
} from "../../../../packages/shared/src/video";

export function videoSourceKey(payload: any): string {
  return payload.url?.trim() || payload.fileObjectId || "";
}
export function VideoMetadata({
  payload,
  onDetected,
}: {
  payload: any;
  onDetected: (source: string, duration: number | undefined) => void;
}) {
  const source = videoSourceKey(payload);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    source: string;
    url?: string;
    duration?: number;
    error?: Error;
  }>({ source });
  useEffect(() => {
    let cancelled = false;
    onDetected(source, undefined);
    setState({ source });
    if (!source) return;
    const debounce = setTimeout(() => {
      if (payload.url) {
        if (videoSource(source).kind === "unsupported") {
          setState({
            source,
            error: new Error(
              "Tautan ini tidak menyediakan durasi dan waktu pemutaran. Gunakan tautan video YouTube, MP4/WebM langsung, atau unggah video. Untuk halaman lain, pilih materi Tautan referensi.",
            ),
          });
        } else setState({ source, url: source });
      } else {
        void api(`/files/${payload.fileObjectId}/download-ticket`, "POST", {
          inline: true,
        })
          .then((ticket) => {
            if (!cancelled) setState({ source, url: ticket.url });
          })
          .catch((error) => {
            if (!cancelled) setState({ source, error });
          });
      }
    }, 400);
    const timeout = setTimeout(() => {
      if (!cancelled)
        setState((before) =>
          before.duration || before.error
            ? before
            : {
                ...before,
                error: new Error(
                  "Durasi belum dapat dibaca. Coba putar pratinjau video atau periksa koneksi, lalu pilih Baca ulang durasi.",
                ),
              },
        );
    }, 20000);
    return () => {
      cancelled = true;
      clearTimeout(debounce);
      clearTimeout(timeout);
    };
  }, [source, attempt]);
  const current = state.source === source ? state : { source };
  return (
    <div className="video-metadata">
      <div className="video-duration-status" role="status" aria-live="polite">
        <strong>Durasi otomatis</strong>
        <span>
          {!source
            ? "Pilih sumber video untuk membaca durasinya."
            : current.error
              ? current.error.message
              : current.duration
                ? `${formatVideoDuration(current.duration)} · Dibaca dari video`
                : "Membaca durasi video…"}
        </span>
      </div>
      {current.url && (
        <VideoPlayer
          key={`${source}:${attempt}`}
          src={current.url}
          title="Pratinjau video materi"
          onDuration={(duration) => {
            setState((before) => ({ ...before, duration, error: undefined }));
            onDetected(source, duration);
          }}
          onError={(error) => {
            setState((before) => ({ ...before, duration: undefined, error }));
            onDetected(source, undefined);
          }}
        />
      )}
      {current.error && (
        <Action
          run={async () => {
            setAttempt((value) => value + 1);
            return false;
          }}
        >
          Baca ulang durasi
        </Action>
      )}
      <p className="muted">
        Durasi dibaca dari metadata pemutar untuk menghitung progres menonton.
        Gunakan rekaman dengan durasi tetap; atur siaran langsung sebagai
        Pertemuan daring.
      </p>
    </div>
  );
}
