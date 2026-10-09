import { useEffect, useRef } from "react";
import {
  validVideoDuration,
  videoSource,
} from "../../../../packages/shared/src/video";

export interface VideoSample {
  position: number;
  duration: number;
  playing: boolean;
}
interface YouTubePlayer {
  getDuration(): number;
  getCurrentTime(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  destroy(): void;
}
interface YouTubeApi {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onReady: () => void;
        onStateChange: () => void;
        onError: () => void;
      };
    },
  ) => YouTubePlayer;
}
declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let youtubeLoading: Promise<YouTubeApi> | undefined;
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeLoading) return youtubeLoading;
  youtubeLoading = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      window.onYouTubeIframeAPIReady = previous;
      if (error) {
        script.remove();
        youtubeLoading = undefined;
        reject(error);
      } else if (window.YT?.Player) resolve(window.YT);
    };
    const timeout = setTimeout(
      () =>
        finish(
          new Error(
            "Pemutar YouTube belum merespons. Periksa koneksi lalu coba lagi.",
          ),
        ),
      20000,
    );
    window.onYouTubeIframeAPIReady = () => {
      finish();
      previous?.();
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () =>
      finish(
        new Error(
          "Pemutar YouTube tidak dapat dimuat. Periksa koneksi lalu coba lagi.",
        ),
      );
    document.head.appendChild(script);
  });
  return youtubeLoading;
}

/** Both players report real metadata and playback positions, never a synthetic completion. */
export function VideoPlayer({
  src,
  title,
  startPosition = 0,
  watchLimit,
  onDuration,
  onSample,
  onError,
}: {
  src: string;
  title: string;
  startPosition?: number;
  watchLimit?: () => number;
  onDuration: (duration: number) => void;
  onSample?: (sample: VideoSample) => void;
  onError: (error: Error) => void;
}) {
  const native = useRef<HTMLVideoElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onDuration, onSample, onError, watchLimit });
  const hasMetadata = useRef(false);
  callbacks.current = { onDuration, onSample, onError, watchLimit };
  const source = videoSource(src);
  const reportDuration = (duration: number) => {
    if (!validVideoDuration(duration)) {
      callbacks.current.onError(
        new Error(
          "Durasi video belum tersedia atau melebihi 10 jam. Gunakan rekaman video MP4/WebM atau YouTube dengan durasi tetap.",
        ),
      );
      return false;
    }
    callbacks.current.onDuration(duration);
    hasMetadata.current = true;
    return true;
  };
  const sampleNative = () => {
    const video = native.current;
    if (video && validVideoDuration(video.duration))
      callbacks.current.onSample?.({
        position: video.currentTime,
        duration: video.duration,
        playing: !video.paused && !video.ended,
      });
  };
  useEffect(() => {
    let cancelled = false;
    let player: YouTubePlayer | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    hasMetadata.current = false;
    const metadataTimeout = setTimeout(() => {
      if (!cancelled && !hasMetadata.current)
        callbacks.current.onError(
          new Error(
            "Durasi belum dapat dibaca. Coba putar video atau periksa koneksi, lalu muat ulang.",
          ),
        );
    }, 20000);
    if (source.kind === "youtube" && iframe.current) {
      const element = iframe.current;
      let duration = 0,
        lastSample = 0,
        ready = false;
      const read = (force = false) => {
        if (!player || !ready || cancelled) return;
        const nextDuration = player.getDuration();
        if (validVideoDuration(nextDuration) && nextDuration !== duration) {
          duration = nextDuration;
          reportDuration(duration);
        }
        const position = player.getCurrentTime();
        const limit = callbacks.current.watchLimit?.();
        if (limit !== undefined && position > limit + 0.5) {
          player.seekTo(limit, true);
          return;
        }
        if (callbacks.current.watchLimit && player.getPlaybackRate() > 1)
          player.setPlaybackRate(1);
        const playing = player.getPlayerState() === 1;
        if (
          duration &&
          (force || (playing && Date.now() - lastSample >= 5000))
        ) {
          lastSample = Date.now();
          callbacks.current.onSample?.({ position, duration, playing });
        }
      };
      void loadYouTubeApi()
        .then((api) => {
          if (cancelled) return;
          player = new api.Player(element, {
            events: {
              onReady: () => {
                if (cancelled) return;
                ready = true;
                if (startPosition) player?.seekTo(startPosition, true);
                read(true);
                timer = setInterval(() => read(), 250);
              },
              onStateChange: () => read(true),
              onError: () => {
                if (!cancelled)
                  callbacks.current.onError(
                    new Error(
                      "Video YouTube tidak tersedia atau tidak mengizinkan sematan. Periksa tautan dan izin video lalu coba lagi.",
                    ),
                  );
              },
            },
          });
        })
        .catch((error) => {
          if (!cancelled) callbacks.current.onError(error);
        });
    } else if (source.kind === "native") {
      timer = setInterval(() => {
        if (native.current && !native.current.paused) sampleNative();
      }, 5000);
    }
    return () => {
      cancelled = true;
      clearTimeout(metadataTimeout);
      clearInterval(timer);
      player?.destroy();
    };
  }, [src]);

  if (source.kind === "unsupported") return null;
  return (
    <div className="video-player">
      {source.kind === "youtube" ? (
        <iframe
          ref={iframe}
          title={title}
          src={`${source.url}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}&playsinline=1&rel=0`}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <video
          ref={native}
          src={src}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          aria-label={title}
          onError={() =>
            callbacks.current.onError(
              new Error(
                "Video tidak dapat dibaca. Periksa koneksi, format MP4/WebM, dan izin tautan lalu coba lagi.",
              ),
            )
          }
          onLoadedMetadata={() => {
            const video = native.current;
            if (video && reportDuration(video.duration)) {
              video.currentTime = Math.min(startPosition, video.duration);
              sampleNative();
            }
          }}
          onDurationChange={() => {
            if (native.current && native.current.readyState >= 1)
              reportDuration(native.current.duration);
          }}
          onPlay={sampleNative}
          onPause={sampleNative}
          onEnded={sampleNative}
          onRateChange={() => {
            if (watchLimit && native.current && native.current.playbackRate > 1)
              native.current.playbackRate = 1;
          }}
          onSeeking={() => {
            const video = native.current;
            const limit = callbacks.current.watchLimit?.();
            if (video && limit !== undefined && video.currentTime > limit + 0.5)
              video.currentTime = limit;
          }}
        />
      )}
    </div>
  );
}
