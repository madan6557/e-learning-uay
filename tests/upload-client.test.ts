import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, setAuthToken, uploadFile } from "../apps/web/src/services/api.js";

test("binary uploads authenticate only app endpoints and preserve server errors", async () => {
  const original = {
    fetch: globalThis.fetch,
    window: globalThis.window,
    XMLHttpRequest: globalThis.XMLHttpRequest,
  };
  let url = "https://learning.example/api/v1/files/upload/file-id";
  let status = 200;
  let responseText = "";
  let confirms = 0;
  let xhr: FakeXHR;
  class FakeXHR {
    headers: Record<string, string> = {};
    upload = {};
    withCredentials = false;
    status = status;
    responseText = responseText;
    onload!: () => void;
    constructor() { xhr = this; }
    open(method: string, target: string) {
      assert.equal(method, "PUT");
      assert.equal(target, url);
    }
    setRequestHeader(key: string, value: string) { this.headers[key] = value; }
    send() { this.onload(); }
  }
  Object.assign(globalThis, {
    window: { location: { href: "https://learning.example/course" } },
    XMLHttpRequest: FakeXHR,
    fetch: async (input: string, init: RequestInit) => {
      assert.equal((init.headers as any).Authorization, "Bearer session-token");
      if (input.endsWith("/confirm")) {
        confirms++;
        return Response.json({ id: "file-id" });
      }
      return Response.json({ uploadUrl: url, fileObjectId: "file-id", headers: { "Content-Type": "application/pdf" } });
    },
  });
  setAuthToken("session-token");
  const upload = () => uploadFile(new File(["%PDF-test"], "lesson.pdf", { type: "application/pdf" }), "class", "RESOURCE", undefined, () => {});
  try {
    await upload();
    assert.equal(xhr!.headers.Authorization, "Bearer session-token");
    assert.equal(xhr!.withCredentials, true);
    assert.equal(confirms, 1);

    // An external URL with the same path must not receive session credentials.
    url = "https://storage.example/api/v1/files/upload/file-id";
    await upload();
    assert.equal(xhr!.headers.Authorization, undefined);
    assert.equal(xhr!.withCredentials, false);

    url = "https://learning.example/api/v1/files/upload/file-id";
    status = 401;
    responseText = JSON.stringify({ error: { code: "LOGIN_REQUIRED", requestId: "request-123" } });
    await assert.rejects(upload, (error: any) => error instanceof ApiError && error.code === "LOGIN_REQUIRED" && error.requestId === "request-123");
    status = 403;
    responseText = JSON.stringify({ error: { code: "FILE_SERVICE_REJECTED", details: { message: "Policy mismatch" } } });
    await assert.rejects(upload, (error: any) => error instanceof ApiError && error.details.message === "Policy mismatch");
    status = 413;
    responseText = "{}";
    await assert.rejects(upload, /Ukuran berkas terlalu besar/);
    status = 502;
    responseText = "<html>Bad gateway</html>";
    await assert.rejects(upload, /HTTP 502/);
    assert.equal(confirms, 2, "failed uploads must not be confirmed");
  } finally {
    setAuthToken(null);
    Object.assign(globalThis, original);
  }
});
