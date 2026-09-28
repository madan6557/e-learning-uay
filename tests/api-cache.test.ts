import test from "node:test";
import assert from "node:assert/strict";
import { api } from "../apps/web/src/lib.js";
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
