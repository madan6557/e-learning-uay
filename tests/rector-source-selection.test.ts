import test from "node:test";
import assert from "node:assert/strict";

import { FixtureDataSource } from "../apps/api/src/rector/fixture.js";
import { DynamicReportingDataSource } from "../apps/api/src/rector/source.js";

test("live rector reporting never substitutes fixture data for an empty university", async () => {
  const fixture = await new FixtureDataSource().readSnapshot();
  const empty = { ...fixture, lecturers: [], classes: [], activities: [] };
  const liveSource = { readSnapshot: async () => empty };
  const fallbackSource = {
    readSnapshot: async () => {
      throw new Error("Fixture must not be read in live mode");
    },
  };
  assert.deepEqual(
    await new DynamicReportingDataSource(false, liveSource, fallbackSource).readSnapshot(),
    empty,
  );
  assert.deepEqual(
    await new DynamicReportingDataSource(true, liveSource, new FixtureDataSource()).readSnapshot(),
    fixture,
  );
});

test("live rector reporting exposes source errors rather than presenting simulated data", async () => {
  const sourceError = new Error("University source unavailable");
  const failingSource = {
    readSnapshot: async () => {
      throw sourceError;
    },
  };
  await assert.rejects(
    new DynamicReportingDataSource(false, failingSource).readSnapshot(),
    sourceError,
  );
});
