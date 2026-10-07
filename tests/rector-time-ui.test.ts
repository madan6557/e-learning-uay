import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

for (const zone of [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "UTC",
  "America/New_York",
]) {
  test(`rector timestamps, daily sessions and exports follow the device in ${zone}`, () => {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "tests/fixtures/rector-time-ui.tsx"],
      {
        env: { ...process.env, TZ: zone },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(
      result.stdout,
      /local timestamps, midnight and report consistency verified/,
    );
  });
}
