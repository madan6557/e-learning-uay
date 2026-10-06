import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

for (const zone of ["Asia/Jakarta", "Asia/Makassar"]) {
  test(`attendance forms preserve local calendar dates and UTC instants in ${zone}`, () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "tests/fixtures/attendance-time-ui.tsx"], {
      env: { ...process.env, TZ: zone }, encoding: "utf8", windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /local dates, overnight schedules and unchanged UTC payloads verified/);
  });
}
