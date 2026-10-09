import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act, createElement } from "react";
import {
  videoSource,
  validVideoDuration,
  formatVideoDuration,
} from "../packages/shared/src/video.js";
import {
  VideoPlayer,
  type VideoSample,
} from "../apps/web/src/components/VideoPlayer.js";
import { VideoMetadata } from "../apps/web/src/components/VideoMetadata.js";
import { VideoProgressViewer } from "../apps/web/src/components/VideoProgressViewer.js";

Object.assign(globalThis, { React });
const { createRoot } = await import("react-dom/client");
test("video sources recognize actual YouTube hosts and require a trackable source", () => {
  for (const url of [
    "https://youtu.be/M7lc1UVf-VE",
    "https://www.youtube.com/watch?v=M7lc1UVf-VE&t=90",
    "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
    "https://m.youtube.com/shorts/M7lc1UVf-VE",
  ])
    assert.deepEqual(videoSource(url), {
      kind: "youtube",
      videoId: "M7lc1UVf-VE",
      url: "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
    });
  assert.equal(videoSource("https://notyoutube.com/video.mp4").kind, "native");
  assert.equal(
    videoSource("https://www.youtube.com/playlist?list=abc").kind,
    "unsupported",
  );
  assert.equal(
    videoSource("https://drive.google.com/file/d/abc/preview").kind,
    "unsupported",
  );
  assert.equal(videoSource("javascript:alert(1)").kind, "unsupported");
  assert.equal(
    videoSource("https://cdn.example.test/movie.webm").kind,
    "native",
  );
});
test("duration rejects missing/live/nonfinite metadata instead of inventing 300 seconds", () => {
  for (const duration of [0, -1, Infinity, NaN, 36001])
    assert.equal(validVideoDuration(duration), false);
  assert.equal(validVideoDuration(5.12), true);
  assert.equal(formatVideoDuration(18528), "5:08:48");
  assert.equal(formatVideoDuration(5.12), "0:06");
});

function setup() {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  return { dom, root: createRoot(document.getElementById("root")!) };
}
test("native video reads precise metadata and reports actual playback, with seek bounds", async () => {
  const { dom, root } = setup();
  const durations: number[] = [],
    samples: VideoSample[] = [],
    errors: Error[] = [];
  try {
    await act(async () =>
      root.render(
        createElement(VideoPlayer, {
          src: "https://cdn.example.test/video.mp4",
          title: "Video",
          startPosition: 3,
          watchLimit: () => 3,
          onDuration: (value: number) => durations.push(value),
          onSample: (sample: VideoSample) => samples.push(sample),
          onError: (error: Error) => errors.push(error),
        }),
      ),
    );
    const video = document.querySelector("video")!;
    Object.defineProperty(video, "duration", {
      value: 61.25,
      configurable: true,
    });
    Object.defineProperty(video, "readyState", { value: 1 });
    await act(async () =>
      video.dispatchEvent(new dom.window.Event("loadedmetadata")),
    );
    assert.equal(durations.at(-1), 61.25);
    assert.equal(samples.at(-1)?.position, 3);
    assert.equal(samples.at(-1)?.duration, 61.25);
    video.currentTime = 40;
    await act(async () => video.dispatchEvent(new dom.window.Event("seeking")));
    assert.equal(video.currentTime, 3);
    Object.defineProperty(video, "duration", { value: Infinity });
    await act(async () =>
      video.dispatchEvent(new dom.window.Event("durationchange")),
    );
    assert.match(errors.at(-1)!.message, /Durasi video belum tersedia/);
    assert.equal(durations.length, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
test("YouTube uses IFrame metadata and actual paused/playing position; cleanup destroys player", async () => {
  const { dom, root } = setup();
  let events: any,
    destroyed = false,
    position = 0,
    playing = false,
    seeks: number[] = [];
  const samples: VideoSample[] = [],
    durations: number[] = [];
  (dom.window as any).YT = {
    Player: class {
      constructor(_element: any, options: any) {
        events = options.events;
      }
      getDuration() {
        return 125.4;
      }
      getCurrentTime() {
        return position;
      }
      getPlayerState() {
        return playing ? 1 : 2;
      }
      getPlaybackRate() {
        return 1;
      }
      setPlaybackRate() {}
      seekTo(value: number) {
        seeks.push(value);
        position = value;
      }
      destroy() {
        destroyed = true;
      }
    },
  };
  try {
    await act(async () =>
      root.render(
        createElement(VideoPlayer, {
          src: "https://youtu.be/M7lc1UVf-VE",
          title: "YouTube",
          startPosition: 5,
          watchLimit: () => 10,
          onDuration: (value: number) => durations.push(value),
          onSample: (sample: VideoSample) => samples.push(sample),
          onError: (error: Error) => {
            throw error;
          },
        }),
      ),
    );
    await act(async () => events.onReady());
    assert.deepEqual(durations, [125.4]);
    assert.equal(samples.at(-1)?.position, 5);
    position = 7;
    playing = true;
    await act(async () => events.onStateChange());
    assert.equal(samples.at(-1)?.position, 7);
    assert.equal(samples.at(-1)?.playing, true);
    playing = false;
    await act(async () => events.onStateChange());
    assert.equal(samples.at(-1)?.playing, false);
    position = 100;
    await act(async () => events.onStateChange());
    assert.equal(seeks.at(-1), 10);
    assert.equal(samples.at(-1)?.position, 7);
    assert.match(
      document.querySelector("iframe")!.src,
      /enablejsapi=1&origin=/,
    );
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
  assert.equal(destroyed, true);
});

test("changing video source invalidates metadata immediately and failed metadata has a retry", async () => {
  const { dom, root } = setup();
  const detections: [string, number | undefined][] = [];
  const onDetected = (source: string, duration: number | undefined) =>
    detections.push([source, duration]);
  try {
    await act(async () => {
      root.render(
        createElement(VideoMetadata, {
          payload: { url: "https://cdn.example.test/first.mp4" },
          onDetected,
        }),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    const video = document.querySelector("video")!;
    Object.defineProperty(video, "duration", { value: 61.25 });
    await act(async () =>
      video.dispatchEvent(new dom.window.Event("loadedmetadata")),
    );
    assert.equal(detections.at(-1)?.[1], 61.25);
    assert.match(
      document.querySelector(".video-duration-status")!.textContent!,
      /1:02/,
    );
    await act(async () =>
      root.render(
        createElement(VideoMetadata, {
          payload: { url: "https://cdn.example.test/second.mp4" },
          onDetected,
        }),
      ),
    );
    assert.deepEqual(detections.at(-1), [
      "https://cdn.example.test/second.mp4",
      undefined,
    ]);
    assert.equal(document.querySelector("video"), null);
    assert.match(
      document.querySelector(".video-duration-status")!.textContent!,
      /Membaca durasi/,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    await act(async () =>
      document
        .querySelector("video")!
        .dispatchEvent(new dom.window.Event("error")),
    );
    assert.equal(detections.at(-1)?.[1], undefined);
    assert.match(
      document.body.textContent!,
      /Periksa koneksi, format MP4\/WebM/,
    );
    assert.equal(
      document.querySelector("button")!.textContent,
      "Baca ulang durasi",
    );
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("progress shows confirmed server values, keeps them on failure, and retries actual position", async () => {
  const { dom, root } = setup();
  const originalFetch = globalThis.fetch;
  const positions: number[] = [];
  let fail = false;
  globalThis.fetch = (async (_url: any, options: any) => {
    if (fail) throw new Error("offline");
    const { position } = JSON.parse(options.body);
    positions.push(position);
    return {
      ok: true,
      status: 200,
      json: async () => ({ watchedSeconds: position, percent: position * 2 }),
    } as Response;
  }) as typeof fetch;
  try {
    await act(async () =>
      root.render(
        createElement(VideoProgressViewer, {
          resource: {
            id: "video-test",
            title: "Video",
            dynamicPayload: {
              url: "https://cdn.example.test/video.mp4",
              durationSeconds: 50,
            },
          },
          previous: undefined,
          writable: true,
        }),
      ),
    );
    const video = document.querySelector("video")!;
    Object.defineProperty(video, "duration", { value: 50, configurable: true });
    await act(async () =>
      video.dispatchEvent(new dom.window.Event("loadedmetadata")),
    );
    video.currentTime = 5;
    await act(async () => video.dispatchEvent(new dom.window.Event("pause")));
    assert.equal(document.querySelector("progress")!.value, 10);
    assert.match(document.body.textContent!, /Progres menonton tersimpan/);
    fail = true;
    video.currentTime = 6;
    await act(async () => video.dispatchEvent(new dom.window.Event("pause")));
    assert.equal(document.querySelector("progress")!.value, 10);
    assert.match(document.body.textContent!, /belum tersimpan/);
    fail = false;
    await act(async () => document.querySelector("button")!.click());
    assert.equal(positions.at(-1), 6);
    assert.equal(document.querySelector("progress")!.value, 12);
    Object.defineProperty(video, "duration", { value: 70, configurable: true });
    const requestsBefore = positions.length;
    await act(async () =>
      video.dispatchEvent(new dom.window.Event("loadedmetadata")),
    );
    assert.equal(positions.length, requestsBefore);
    assert.match(document.body.textContent!, /Durasi video berbeda/);
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => root.unmount());
    dom.window.close();
  }
});
