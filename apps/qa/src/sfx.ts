import type { Status } from "./model";

export type QaSoundKind = "step" | "completion" | `status-${Status}`;
type ToneContext = Pick<
  AudioContext,
  "currentTime" | "destination" | "createOscillator" | "createGain"
>;

const tones: Record<
  QaSoundKind,
  { frequencies: number[]; spacing: number; duration: number; type: OscillatorType; volume: number }
> = {
  step: { frequencies: [880], spacing: 0.16, duration: 0.2, type: "sine", volume: 0.095 },
  completion: {
    frequencies: [659.25, 880],
    spacing: 0.16,
    duration: 0.2,
    type: "sine",
    volume: 0.095,
  },
  "status-pass": {
    frequencies: [784, 1046.5],
    spacing: 0.11,
    duration: 0.14,
    type: "triangle",
    volume: 0.085,
  },
  "status-fail": {
    frequencies: [440, 349.23, 293.66],
    spacing: 0.12,
    duration: 0.16,
    type: "triangle",
    volume: 0.075,
  },
  "status-blocked": {
    frequencies: [392, 392],
    spacing: 0.19,
    duration: 0.11,
    type: "square",
    volume: 0.045,
  },
  "status-not_run": {
    frequencies: [587.33],
    spacing: 0.16,
    duration: 0.1,
    type: "sine",
    volume: 0.055,
  },
};

export function scheduleQaSound(context: ToneContext, kind: QaSoundKind) {
  const scheduled = createScheduledQaSound(context, kind);
  return scheduled.duration;
}

function createScheduledQaSound(context: ToneContext, kind: QaSoundKind) {
  const sound = tones[kind];
  const oscillators: Array<Pick<OscillatorNode, "stop">> = [];
  sound.frequencies.forEach((frequency, index) => {
    const startAt = context.currentTime + index * sound.spacing;
    const oscillator = context.createOscillator();
    oscillators.push(oscillator);
    const envelope = context.createGain();
    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(sound.volume, startAt + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + sound.duration);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + sound.duration + 0.01);
  });
  const duration =
    (sound.frequencies.length - 1) * sound.spacing +
    sound.duration +
    0.05;
  return {
    duration,
    cancel() {
      oscillators.forEach((oscillator) => {
        try {
          oscillator.stop(context.currentTime);
        } catch {
          /* A tone that already ended cannot be cancelled. */
        }
      });
    },
  };
}

type ActiveToneContext = ToneContext &
  Pick<AudioContext, "state" | "resume">;

export async function resumeAndScheduleQaSound(
  context: ActiveToneContext,
  kind: QaSoundKind,
) {
  let resume: Promise<void> | undefined;
  try {
    if (context.state !== "running") {
      resume = context.resume();
      void resume.catch(() => false);
    }
    const scheduled = createScheduledQaSound(context, kind);
    if (resume) {
      try {
        await resume;
      } catch {
        scheduled.cancel();
        return false;
      }
    }
    if (context.state !== "running") {
      scheduled.cancel();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (typeof AudioContextConstructor !== "function") return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed")
    sharedAudioContext = new AudioContextConstructor();
  return sharedAudioContext;
}

export function warmUpQaSound() {
  try {
    const context = getSharedAudioContext();
    if (!context) return false;
    if (context.state !== "running") void context.resume().catch(() => false);
    return true;
  } catch {
    return false;
  }
}

export async function playQaSound(kind: QaSoundKind) {
  try {
    const context = getSharedAudioContext();
    if (!context) return false;
    return await resumeAndScheduleQaSound(context, kind);
  } catch {
    return false;
  }
}
