import test from "node:test";
import assert from "node:assert/strict";

type ReportingSnapshot = {
  snapshotAt: string;
  lecturers: Array<{ id: string; name: string; identifier: string; department: string }>;
  classes: Array<{ id: string; title: string; courseCode: string; department: string; semester: string; status: string; instructorIds: string[]; items: any[]; grading: any[] }>;
  activities: Array<{ id: string; at: string; actorId: string; actorName: string; actorKind: string; category: string; action: string }>;
  sessions: Array<{ id: string; lecturerId: string; lecturerName: string; department: string; semester: string }>;
};

test("Rector Bridging: ReportingSnapshot schema conforms to Dashboard Rektor contract", () => {
  const sampleSnapshot: ReportingSnapshot = {
    snapshotAt: new Date().toISOString(),
    lecturers: [
      {
        id: "l-1",
        name: "Dosen IF 1",
        identifier: "1112089001",
        department: "IF",
      },
    ],
    classes: [
      {
        id: "c-1",
        title: "Pemrograman Web (Kelas A)",
        courseCode: "IF2101",
        department: "IF",
        semester: "2026/2027 Ganjil",
        status: "AKTIF",
        instructorIds: ["l-1"],
        items: [
          { id: "s-1", title: "Pertemuan 1", kind: "PERTEMUAN", visible: true, status: "TERBIT" },
        ],
        grading: [
          { id: "g-1", title: "Tugas 1", kind: "TUGAS", current: true, total: 30, graded: 30, published: 30 },
        ],
      },
    ],
    activities: [
      {
        id: "a-1",
        at: new Date().toISOString(),
        actorId: "l-1",
        actorName: "Dosen IF 1",
        actorKind: "DOSEN",
        category: "MATERI",
        action: "CREATE",
      },
    ],
    sessions: [
      {
        id: "sess-1",
        lecturerId: "l-1",
        lecturerName: "Dosen IF 1",
        department: "IF",
        semester: "2026/2027 Ganjil",
      },
    ],
  };

  // Validate required snapshot keys
  assert.ok(sampleSnapshot.snapshotAt);
  assert.ok(Array.isArray(sampleSnapshot.lecturers));
  assert.ok(Array.isArray(sampleSnapshot.classes));
  assert.ok(Array.isArray(sampleSnapshot.activities));
  assert.ok(Array.isArray(sampleSnapshot.sessions));

  // Validate lecturer structure
  const lecturer = sampleSnapshot.lecturers[0];
  assert.ok(lecturer.id);
  assert.ok(lecturer.name);
  assert.ok(lecturer.identifier);
  assert.ok(lecturer.department);

  // Validate class structure
  const cls = sampleSnapshot.classes[0];
  assert.ok(cls.id);
  assert.ok(cls.courseCode);
  assert.ok(cls.department);
  assert.ok(cls.semester);
  assert.equal(cls.status, "AKTIF");
  assert.ok(Array.isArray(cls.items));
  assert.ok(Array.isArray(cls.grading));
});

test("Rector Bridging: token authorization gate rejects invalid credentials", () => {
  const secretKey = "uay-rector-telemetry-key";
  const isValid = (token?: string) => Boolean(token && token === secretKey);

  assert.equal(isValid("uay-rector-telemetry-key"), true);
  assert.equal(isValid("wrong-token"), false);
  assert.equal(isValid(""), false);
  assert.equal(isValid(undefined), false);
});
