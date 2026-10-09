import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { indexedDB } from "fake-indexeddb";
import { createElement, act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  getDraft,
  saveDraft,
  removeDraft,
  countDrafts,
} from "../apps/web/src/drafts.js";
import {
  DraftUserContext,
  useLocalDraft,
} from "../apps/web/src/useLocalDraft.js";

test("local drafts are isolated, recoverable and cleared after successful save", async (suite) => {
  const dom = new JSDOM("<div id='root'></div>", {
    url: "http://localhost/#/classes/test",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    indexedDB,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const rootEl = document.getElementById("root")!;
  let root: Root;
  let current: ReturnType<typeof useLocalDraft<any>>, update: (v: any) => void;
  let serverVersion = "v1";
  function Editor() {
    const [value, setValue] = useState({ title: "Server", blocks: [] });
    update = setValue;
    current = useLocalDraft(
      "resource:test",
      value,
      setValue,
      true,
      serverVersion,
    );
    return createElement("p", {}, value.title);
  }
  const mount = async () => {
    root = createRoot(rootEl);
    await act(async () => {
      root.render(
        createElement(
          DraftUserContext.Provider,
          { value: "user-a" },
          createElement(Editor),
        ),
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
  };
  try {
    await suite.test(
      "different users and entities never share data",
      async () => {
        await saveDraft("user-a", "one", { title: "A" });
        await saveDraft("user-b", "one", { title: "B" });
        assert.deepEqual((await getDraft("user-a", "one"))?.value, {
          title: "A",
        });
        assert.equal(await getDraft("user-a", "two"), undefined);
        await removeDraft("user-a");
        assert.equal(await countDrafts("user-a"), 0);
        assert.equal(await countDrafts("user-b"), 1);
      },
    );
    await suite.test(
      "debounce persists complex edits and remount offers recovery",
      async () => {
        await mount();
        assert.equal(current!.dirty, false);
        const value = {
          title: "Draft belajar",
          blocks: [{ type: "paragraph", text: "Isi materi" }],
        };
        await act(async () => update(value));
        await act(async () => {
          await new Promise((r) => setTimeout(r, 1150));
        });
        assert.deepEqual(
          (await getDraft("user-a", "resource:test"))?.value,
          value,
        );
        assert.equal(current!.status, "Tersimpan lokal");
        await act(async () => root.unmount());
        await mount();
        assert.ok(current!.recovery);
        assert.equal(rootEl.textContent, "Server");
        await act(async () => current!.restore());
        assert.equal(rootEl.textContent, "Draft belajar");
        assert.equal(current!.dirty, true);
        await act(async () => current!.saved());
        assert.equal(current!.dirty, false);
        await act(async () => root.unmount());
        await new Promise((r) => setTimeout(r, 30));
        assert.equal(await getDraft("user-a", "resource:test"), undefined);
      },
    );
    await suite.test(
      "unmount before debounce flushes the draft; discard removes recovery",
      async () => {
        await mount();
        await act(async () => update({ title: "Cepat", blocks: [] }));
        await act(async () => root.unmount());
        await new Promise((r) => setTimeout(r, 30));
        assert.equal(
          (await getDraft("user-a", "resource:test"))?.value &&
            ((await getDraft("user-a", "resource:test"))!.value as any).title,
          "Cepat",
        );
        await mount();
        await act(async () => current!.discard());
        assert.equal(current!.recovery, null);
        assert.equal(await getDraft("user-a", "resource:test"), undefined);
        await act(async () => root.unmount());
      },
    );
    await suite.test(
      "returning to the server value clears the local draft",
      async () => {
        await mount();
        await act(async () => update({ title: "Sementara", blocks: [] }));
        await act(async () => {
          await new Promise((r) => setTimeout(r, 1150));
        });
        assert.ok(await getDraft("user-a", "resource:test"));
        await act(async () => update({ title: "Server", blocks: [] }));
        await act(async () => {
          await new Promise((r) => setTimeout(r, 30));
        });
        assert.equal(current!.dirty, false);
        assert.equal(await getDraft("user-a", "resource:test"), undefined);
        await act(async () => root.unmount());
      },
    );
    await suite.test(
      "new edits can replace optional recovery and still autosave",
      async () => {
        await saveDraft(
          "user-a",
          "resource:test",
          { title: "Old draft", blocks: [] },
          "v1",
        );
        await mount();
        assert.ok(current!.recovery);
        await act(async () => update({ title: "New edit", blocks: [] }));
        assert.equal(current!.recovery, null);
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1150));
        });
        assert.equal(
          ((await getDraft("user-a", "resource:test"))!.value as any).title,
          "New edit",
        );
        await act(async () => root.unmount());
      },
    );
    await suite.test(
      "a newer server revision removes stale content without offering recovery",
      async () => {
        serverVersion = "v2";
        await mount();
        assert.equal(current!.recovery, null);
        assert.equal(await getDraft("user-a", "resource:test"), undefined);
        assert.match(current!.status, /versi server lebih baru/);
        assert.equal(rootEl.textContent, "Server");
        await act(async () => root.unmount());
      },
    );
    await suite.test(
      "stale cleanup cannot delete a replacement draft written after inspection",
      async () => {
        await saveDraft("user-a", "race", { title: "Old" }, "v1");
        const before = (await getDraft("user-a", "race"))!;
        await new Promise((resolve) => setTimeout(resolve, 5));
        await saveDraft("user-a", "race", { title: "New" }, "v2");
        await removeDraft("user-a", "race", before.updatedAt);
        assert.equal(
          ((await getDraft("user-a", "race"))!.value as any).title,
          "New",
        );
      },
    );
    await suite.test(
      "legacy drafts older than a server update are cleared using timestamps",
      async () => {
        await saveDraft("user-a", "resource:test", {
          title: "Legacy",
          blocks: [],
        });
        serverVersion = new Date(Date.now() + 1000).toISOString();
        await mount();
        assert.equal(current!.recovery, null);
        assert.equal(await getDraft("user-a", "resource:test"), undefined);
        await act(async () => root.unmount());
      },
    );
  } finally {
    await removeDraft("user-a");
    await removeDraft("user-b");
    dom.window.close();
  }
});
