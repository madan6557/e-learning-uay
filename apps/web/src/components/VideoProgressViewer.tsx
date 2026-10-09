import { useEffect, useRef, useState } from "react";
import { api, t } from "../services/api";
import { Action } from "./ui/Action";
import { Notice } from "./ui/Notice";
import { VideoPlayer, type VideoSample } from "./VideoPlayer";
import {
  validVideoDuration,
  videoSource,
  formatVideoDuration,
} from "../../../../packages/shared/src/video";

export function VideoProgressViewer({
  resource,
  previous,
  writable,
}: {
  resource: any;
  previous: any;
  writable: boolean;
}) {
  const payload = resource.dynamicPayload || {};
  const [url, setUrl] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(previous?.percent ?? 0);
  const [playerError, setPlayerError] = useState<Error | null>(null);
  const [progressError, setProgressError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [duration, setDuration] = useState(0);
  const busy = useRef(false);
  const watched = useRef(previous?.watchedSeconds ?? 0);
  const clock = useRef({ playing: false, at: Date.now() });
  const lastSample = useRef<VideoSample | undefined>(undefined);
  const matchesDuration =
    validVideoDuration(payload.durationSeconds) &&
    Math.abs(duration - payload.durationSeconds) <= 1;
  const watchLimit = () =>
    Math.min(
      payload.durationSeconds || Infinity,
      watched.current +
        (clock.current.playing
          ? Math.min(8, (Date.now() - clock.current.at) / 1000)
          : 0),
    );

  async function commit(sample: VideoSample) {
    if (
      !writable ||
      busy.current ||
      !validVideoDuration(payload.durationSeconds) ||
      Math.abs(sample.duration - payload.durationSeconds) > 1
    )
      return;
    busy.current = true;
    const sampledAt = Date.now();
    setSaving(true);
    try {
      const result = await api(`/resources/${resource.id}/progress`, "POST", {
        position: Math.min(sample.position, payload.durationSeconds),
      });
      watched.current = result.watchedSeconds;
      clock.current = { playing: clock.current.playing, at: sampledAt };
      setProgress(result.percent);
      setSaved(true);
      setProgressError(null);
    } catch (error) {
      setProgressError(error as Error);
      throw error;
    } finally {
      setSaving(false);
      busy.current = false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    setPlayerError(null);
    setDuration(0);
    setUrl("");
    if (payload.url) {
      if (videoSource(payload.url).kind === "unsupported")
        setPlayerError(
          new Error(
            "Sumber video ini belum mendukung pelacakan otomatis. Minta dosen menggantinya dengan YouTube atau unggahan MP4/WebM.",
          ),
        );
      else setUrl(payload.url);
    } else if (payload.fileObjectId) {
      void api(`/files/${payload.fileObjectId}/download-ticket`, "POST", {
        resourceId: resource.id,
        inline: true,
      })
        .then((ticket) => {
          if (!cancelled) setUrl(ticket.url);
        })
        .catch((error) => {
          if (!cancelled) setPlayerError(error);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [resource.id, payload.fileObjectId, payload.url, attempt]);

  return (
    <div className="video-viewer">
      {url && (
        <VideoPlayer
          key={`${url}:${attempt}`}
          src={url}
          title={resource.title}
          startPosition={Math.min(
            previous?.lastPositionSeconds ?? watched.current,
            watched.current,
          )}
          watchLimit={writable ? watchLimit : undefined}
          onDuration={(value) => {
            setDuration(value);
            setPlayerError(null);
          }}
          onError={setPlayerError}
          onSample={(sample) => {
            lastSample.current = sample;
            if (!clock.current.playing && sample.playing)
              clock.current.at = Date.now();
            clock.current.playing = sample.playing;
            void commit(sample).catch(() => {});
          }}
        />
      )}
      <div className="progress-label">
        <span>
          {t.watched}
          {duration > 0 &&
            ` · ${formatVideoDuration(watched.current)} / ${formatVideoDuration(duration)}`}
        </span>
        <strong>
          {progress > 0 && progress < 1
            ? progress.toLocaleString("id-ID", { maximumFractionDigits: 2 })
            : Math.round(progress)}
          %
        </strong>
      </div>
      <progress
        value={progress}
        max={100}
        aria-label="Progres menonton yang tersimpan"
      />
      {writable && (
        <p className="muted" role="status" aria-live="polite">
          {saving
            ? "Menyimpan progres menonton…"
            : progressError
              ? "Progres terakhir belum tersimpan. Periksa koneksi lalu coba lagi."
              : saved
                ? "Progres menonton tersimpan."
                : "Progres dicatat otomatis saat video diputar."}
        </p>
      )}
      {duration > 0 && !matchesDuration && (
        <Notice
          error={
            new Error(
              "Durasi video berbeda dari data materi. Minta dosen membuka editor dan menyimpan ulang agar progres dihitung dengan durasi otomatis yang benar.",
            )
          }
        />
      )}
      {playerError && (
        <>
          <Notice error={playerError} />
          <Action
            run={async () => {
              setAttempt((value) => value + 1);
              return false;
            }}
          >
            Coba muat ulang video
          </Action>
        </>
      )}
      {progressError && (
        <>
          <Notice error={progressError} />
          <Action
            busyLabel="Menyimpan progres…"
            successMessage="Progres menonton berhasil disimpan."
            run={async () => {
              if (lastSample.current) await commit(lastSample.current);
              else return false;
            }}
          >
            Coba simpan progres lagi
          </Action>
        </>
      )}
    </div>
  );
}
