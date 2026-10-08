import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { GRADE_SCALE_PRESETS, gradeScaleLabel, gradeLetterWithPolicy } from "../packages/shared/src/domain.js";
import { UPLOAD_LIMITS, validateUploadSize } from "../packages/shared/src/files.js";
import { formatClock, formatDateTime } from "../packages/shared/src/time.js";

test("invalid saved timestamps show a readable fallback instead of crashing a form", () => {
  assert.equal(formatDateTime("invalid"), "Waktu tidak tersedia");
  assert.equal(formatClock("invalid"), "Waktu tidak tersedia");
});

test("preset labels agree with production conversion at grade boundaries", () => {
  const policy = GRADE_SCALE_PRESETS["2026.1"];
  for (const [score, letter] of [[75, "B+"], [80, "A-"], [85, "A"]] as const) {
    assert.equal(gradeLetterWithPolicy(score, policy).gradeLetter, letter);
    assert.ok(gradeScaleLabel(policy).includes(`${letter} ≥ ${score}`));
  }
  assert.match(gradeScaleLabel(GRADE_SCALE_PRESETS["2024.1"]), /A ≥ 80, B ≥ 70, C ≥ 60/);
});

test("each upload purpose accepts its exact byte limit and rejects one byte more", () => {
  for (const [purpose, limit] of Object.entries(UPLOAD_LIMITS)) {
    assert.doesNotThrow(() => validateUploadSize(limit, purpose));
    assert.throws(() => validateUploadSize(limit + 1, purpose), /FILE_TYPE_OR_SIZE/);
  }
  assert.throws(() => validateUploadSize(0, "RESOURCE"), /FILE_TYPE_OR_SIZE/);
});

test("device timezone formatting distinguishes UTC+7 and UTC+8 and local inputs round trip as UTC", () => {
  for (const [zone, offset, hour] of [["Asia/Jakarta", "+7", "07"], ["Asia/Makassar", "+8", "08"]]) {
    const script = `import {formatDateTime, formatClock} from './packages/shared/src/time.ts';
      import {localInput, isoInput} from './apps/web/src/lib.tsx';
      const instant = '2026-10-05T00:30:00.000Z';
      const input = localInput(instant);
      console.log(JSON.stringify([formatDateTime(instant), formatClock(instant), isoInput(input), input]));`;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
      env: { ...process.env, TZ: zone }, encoding: "utf8", windowsHide: true,
    });
    assert.equal(result.status, 0, result.stderr);
    const [date, clock, utc, input] = JSON.parse(result.stdout);
    assert.ok(date.includes(`GMT${offset}`), date);
    assert.ok(clock.includes(`GMT${offset}`), clock);
    assert.ok(clock.includes(`${hour}.30`), clock);
    assert.equal(utc, "2026-10-05T00:30:00.000Z");
    assert.equal(input, `2026-10-05T${hour}:30`);
  }
});
