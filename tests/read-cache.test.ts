import test from "node:test";
import assert from "node:assert/strict";
import { ReadCache, readTtl } from "../apps/web/src/readCache.js";

test("simultaneous reads share one request and navigation reuses fresh data", async () => {
  const cache = new ReadCache();
  let calls = 0;
  let resolve!: (value: string) => void;
  const loader = () => {
    calls++;
    return new Promise<string>((r) => {
      resolve = r;
    });
  };
  const first = cache.load("/classes", 30000, loader);
  const second = cache.load("/classes", 30000, loader);
  resolve("private data");
  assert.deepEqual(await Promise.all([first, second]), [
    "private data",
    "private data",
  ]);
  assert.equal(await cache.load("/classes", 30000, loader), "private data");
  assert.equal(calls, 1);
});

test("logout or mutation invalidation prevents an old response restoring the cache", async () => {
  const cache = new ReadCache();
  let resolve!: (value: string) => void;
  const old = cache.load(
    "/classes",
    30000,
    () =>
      new Promise<string>((r) => {
        resolve = r;
      }),
  );
  cache.clear();
  await cache.load("/classes", 30000, async () => "new session");
  resolve("old session");
  await old;
  assert.equal(cache.peek("/classes"), "new session");
  cache.clear();
  assert.equal(cache.peek("/classes"), undefined);
});

test("failed and expired reads can be retried", async () => {
  const cache = new ReadCache();
  await assert.rejects(
    cache.load("/classes", 30000, async () => {
      throw new Error("offline");
    }),
  );
  assert.equal(await cache.load("/classes", 1, async () => "old"), "old");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(await cache.load("/classes", 30000, async () => "new"), "new");
});

test("assessment state, identity and signed file endpoints are never reused", async () => {
  for (const path of [
    "/me",
    "/quizzes/id",
    "/assignments/id",
    "/files/id/access",
    "/course-classes/id/files",
    "/course-classes/id/audit",
  ])
    assert.equal(readTtl(path), 0, path);
  const cache = new ReadCache();
  let calls = 0;
  await cache.load("/live", 0, async () => ++calls);
  await cache.load("/live", 0, async () => ++calls);
  assert.equal(calls, 2);
});
