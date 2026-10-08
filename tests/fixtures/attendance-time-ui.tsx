import assert from "node:assert/strict";
import React, { act, createElement } from "react";
import { JSDOM } from "jsdom";

const dom = new JSDOM('<div id="root"></div>', {
  url: "http://127.0.0.1:5173",
});
const NativeDate = Date;
let currentTime = new NativeDate("2026-10-06T00:30:00").getTime();
class ClockDate extends NativeDate {
  constructor(value?: string | number | Date) {
    super(value === undefined ? currentTime : value);
  }
  static now() {
    return currentTime;
  }
}
Object.assign(globalThis, {
  React,
  Date: ClockDate,
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(dom.window.HTMLDialogElement.prototype, "showModal", {
  value() {
    this.setAttribute("open", "");
  },
});
const { createRoot } = await import("react-dom/client");
const { CreateSessionModal, ScheduleSessionModal } =
  await import("../../apps/web/src/Attendance.js");
const { localInput, localDateInput, isoInput } =
  await import("../../apps/web/src/lib.js");
const requests: { method: string; body: any }[] = [];
let failSave = false;
let pendingSave: (() => void) | undefined;
let delaySave = false;
globalThis.fetch = async (_url, init) => {
  requests.push({
    method: init!.method!,
    body: JSON.parse(init!.body as string),
  });
  if (delaySave)
    await new Promise<void>((resolve) => {
      pendingSave = resolve;
    });
  return new Response(
    JSON.stringify(failSave ? { error: { code: "INVALID_DATE_RANGE" } } : {}),
    { status: failSave ? 400 : 200 },
  );
};
const root = createRoot(dom.window.document.getElementById("root")!);
const inputs = () => [
  ...dom.window.document.querySelectorAll<HTMLInputElement>(
    'input[type="datetime-local"]',
  ),
];
const calendar = () =>
  dom.window.document.querySelector<HTMLInputElement>('input[type="date"]')!
    .value;
const checkbox = (label: string) =>
  [...dom.window.document.querySelectorAll<HTMLLabelElement>("label")]
    .find((el) => el.textContent!.includes(label))!
    .querySelector<HTMLInputElement>('input[type="checkbox"]')!;
const submit = async () => {
  await act(async () =>
    dom.window.document
      .querySelector("form")!
      .dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      ),
  );
  return requests.at(-1)!.body;
};
try {
  for (const [key, now, day, start, end] of [
    [
      "midnight",
      "2026-10-06T00:30:00",
      "2026-10-06",
      "2026-10-06T00:30",
      "2026-10-06T02:30",
    ],
    [
      "year",
      "2026-12-31T23:30:00",
      "2026-12-31",
      "2026-12-31T23:30",
      "2027-01-01T01:30",
    ],
  ]) {
    currentTime = new NativeDate(now).getTime();
    await act(async () =>
      root.render(
        createElement(CreateSessionModal, {
          key,
          classId: "class",
          defaultTitle: "Meeting",
          onClose() {},
          onCreated() {},
        }),
      ),
    );
    assert.equal(calendar(), day);
    await act(async () => checkbox("Jadwalkan Waktu Presensi").click());
    assert.deepEqual(
      inputs().map((input) => input.value),
      [start, end],
    );
    const payload = await submit();
    assert.equal(
      payload.sessionDate,
      new NativeDate(`${day}T00:00:00`).toISOString(),
    );
    assert.equal(payload.startTime, new NativeDate(start).toISOString());
    assert.equal(payload.endTime, new NativeDate(end).toISOString());
    assert.equal(payload.allowSelfCheckIn, true);
    assert.equal(
      new NativeDate(payload.endTime).getTime() -
        new NativeDate(payload.startTime).getTime(),
      2 * 60 * 60 * 1000,
    );
  }
  const session = {
    id: "session",
    title: "Other timezone session",
    isOpen: false,
    allowSelfCheckIn: false,
    sessionDate: "2026-10-05T16:00:00.000Z",
    startTime: "2026-10-06T01:00:12.345Z",
    endTime: "2026-10-06T03:00:45.678Z",
  };
  await act(async () =>
    root.render(
      createElement(ScheduleSessionModal, {
        key: "edit",
        session,
        onClose() {},
        onSaved() {},
      }),
    ),
  );
  assert.equal(
    calendar(),
    process.env.TZ === "Asia/Jakarta" ? "2026-10-05" : "2026-10-06",
  );
  assert.deepEqual(
    inputs().map((input) => input.value),
    [localInput(session.startTime), localInput(session.endTime)],
  );
  const edited = await submit();
  assert.equal(edited.allowSelfCheckIn, false);
  assert.equal(checkbox("Izinkan presensi mandiri").checked, false);
  for (const field of ["sessionDate", "startTime", "endTime"] as const)
    assert.equal(edited[field], session[field]);
  const secondSave = await submit();
  for (const field of ["sessionDate", "startTime", "endTime"] as const)
    assert.equal(secondSave[field], session[field]);
  failSave = true;
  await act(async () => checkbox("Izinkan presensi mandiri").click());
  await submit();
  assert.match(
    dom.window.document.querySelector('[role="alert"]')!.textContent!,
    /tanggal.*tidak valid/i,
  );
  assert.equal(checkbox("Izinkan presensi mandiri").checked, true);
  assert.equal(requests.at(-1)!.body.allowSelfCheckIn, true);
  failSave = false;
  delaySave = true;
  const beforeRequests = requests.length;
  await act(async () => {
    const form = dom.window.document.querySelector("form")!;
    form.dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  assert.equal(requests.length, beforeRequests + 1);
  assert.equal(dom.window.document.querySelector("fieldset")!.disabled, true);
  assert.equal(
    dom.window.document.querySelector<HTMLButtonElement>(
      ".modal-heading button",
    )!.disabled,
    true,
  );
  await act(async () => pendingSave!());
  assert.equal(dom.window.document.querySelector("fieldset")!.disabled, false);

  for (const day of ["2026-10-06", "2026-11-01", "2027-01-01"]) {
    const midnight = isoInput(day)!;
    assert.equal(midnight, new NativeDate(`${day}T00:00:00`).toISOString());
    assert.equal(localDateInput(midnight), day);
    assert.equal(isoInput(localInput(midnight)), midnight);
  }
  assert.equal(localDateInput("invalid"), "");
  assert.equal(localInput("invalid"), "");
  assert.equal(isoInput("invalid"), null);
  console.log(
    "local dates, overnight schedules and unchanged UTC payloads verified",
  );
} finally {
  await act(async () => root.unmount());
  dom.window.close();
}
