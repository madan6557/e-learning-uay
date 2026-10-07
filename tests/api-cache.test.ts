import test from "node:test";
import assert from "node:assert/strict";
import { api, getAuthToken, setAuthToken } from "../apps/web/src/lib.js";
import { readCache } from "../apps/web/src/readCache.js";

test("API navigation reuses dashboard cards and writes invalidate every cached view", async () => {
  const original = globalThis.fetch;
  const requests: { path: string; method: string }[] = [];
  readCache.clear();
  globalThis.fetch = async (input, init) => {
    const path = String(input);
    requests.push({ path, method: init?.method ?? "GET" });
    const body = path.endsWith("?summary=true")
      ? [
          {
            id: "class",
            sections: [],
            progress: {},
            gradingQueue: [],
            name: "A",
          },
        ]
      : { ok: true };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  try {
    await Promise.all([
      api("/course-classes?summary=true"),
      api("/course-classes?summary=true"),
    ]);
    assert.equal(requests.length, 1);
    assert.deepEqual(await api("/course-classes"), [
      { id: "class", name: "A" },
    ]);
    assert.equal(requests.length, 1);
    await api("/course-classes/class", "PATCH", { name: "B" });
    await api("/course-classes?summary=true");
    assert.equal(requests.length, 3);
    await api("/me");
    await api("/me");
    assert.equal(requests.length, 5);
  } finally {
    globalThis.fetch = original;
    readCache.clear();
  }
});

test("notification requests send credentials and expire the session once on 401", async () => {
  const previous = { fetch: globalThis.fetch, window: globalThis.window };
  const events = new EventTarget();
  globalThis.window = events as unknown as Window & typeof globalThis;
  let expired = 0;
  let requests = 0;
  events.addEventListener("session-expired", () => { expired++; });
  readCache.clear();
  setAuthToken("fixture-access-token");
  globalThis.fetch = async (input, init) => {
    requests++;
    assert.equal(String(input), "/api/v1/notifications/unread-count");
    assert.equal(init?.credentials, "same-origin");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fixture-access-token");
    return new Response(JSON.stringify({ error: { code: "SESSION_EXPIRED" } }), { status: 401 });
  };
  try {
    await assert.rejects(() => api("/notifications/unread-count"), (error: any) => error.code === "SESSION_EXPIRED");
    assert.equal(requests, 1);
    assert.equal(expired, 1);
    assert.equal(getAuthToken(), null);
  } finally {
    setAuthToken(null);
    readCache.clear();
    Object.assign(globalThis, previous);
  }
});
