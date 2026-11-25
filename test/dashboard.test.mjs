import assert from "node:assert/strict";
import test from "node:test";
import { defaults, readFilters, taskView, validateSnapshot, writeFilters } from "../site/assets/model.mjs";

function example(id, workstream, title, status, verification, blocked = false) {
  return { id, workstream, title, status, verification, blocked, design: "ready", links: [], summary: "Test example" };
}

const tasks = [
  example("kernel-001", "kernel", "Prepare the test lane", "implemented", "host-checked"),
  example("kernel-002", "kernel", "Run the test lane", "in-progress", "not-run", true),
  example("server-001", "server", "Package the fixture", "todo", "not-run"),
  example("desktop-001", "desktop", "Verify the window", "unclear", "unknown"),
];
const document = { schema: "rust-linux-build.snapshot/v1", snapshotUpdatedAt: "2026-01-02T10:00:00Z", tasks };

test("counts each primary status once, with blockers shown independently", () => {
  const { counts, total } = taskView(tasks, defaults);
  assert.deepEqual(counts, { implemented: 1, "in-progress": 1, todo: 1, unclear: 1, blocked: 1 });
  assert.equal(total, 4);
});

test("combines filters within a workstream and keeps its totals stable", () => {
  const view = taskView(tasks, {
    workstream: "kernel", status: "blocked", q: "LANE RUN", verification: "not-run",
  });
  assert.deepEqual(view.matches.map(task => task.id), ["kernel-002"]);
  assert.equal(view.total, 2);
  assert.equal(view.counts.implemented, 1);
  assert.equal(taskView(tasks, { ...defaults, q: "desktop-001" }).matches.length, 1);
  assert.equal(taskView(tasks, { ...defaults, workstream: "server", status: "implemented" }).matches.length, 0);
});

test("restores shareable filter state and ignores unknown choices", () => {
  const filters = readFilters(new URLSearchParams("workstream=desktop&status=bogus&verification=unknown&q=window"));
  assert.deepEqual(filters, { workstream: "desktop", status: "all", verification: "unknown", q: "window" });
  const params = writeFilters(new URLSearchParams("status=bad&other=kept"), filters);
  assert.equal(params.toString(), "other=kept&workstream=desktop&verification=unknown&q=window");
});

test("accepts an empty snapshot and rejects duplicate rows or an invalid timestamp", () => {
  const empty = { ...document, snapshotUpdatedAt: null, tasks: [] };
  assert.equal(validateSnapshot(empty), empty);
  assert.equal(validateSnapshot(document), document);
  assert.throws(() => validateSnapshot({ ...document, tasks: [...tasks, tasks[0]] }), /duplicate/);
  assert.throws(() => validateSnapshot({ ...document, milestoneTotal: 50 }), /format/);
  assert.throws(() => validateSnapshot({ ...document, snapshotUpdatedAt: "2026-02-30T10:00:00Z" }), /timestamp/);
});

test("rejects private or unsafe links and fields outside the public schema", () => {
  for (const url of [
    "https://github.com/imagine-engineering/rust-linux/blob/main/data",
    "https://github.com/imagine-engineering/rust-linux-build-malicious",
    "https://example.com/imagine-engineering/rust-linux-build",
    "javascript:alert(1)",
  ]) {
    assert.throws(() => validateSnapshot({ ...document, tasks: [{ ...tasks[0], links: [{ label: "Doc", url }] }] }));
  }
  assert.throws(() => validateSnapshot({ ...document, tasks: [{ ...tasks[0], sourceCommit: "123" }] }));
  const task = { ...tasks[0], design: null, links: [{ label: "Doc", url: "https://github.com/imagine-engineering/rust-linux-build/blob/main/README.md" }] };
  assert.doesNotThrow(() => validateSnapshot({ ...document, tasks: [task] }));
});

test("displays explicit target evidence independently of host verification", () => {
  const host = { ...tasks[0], targetVerification: "not-run" };
  const both = { ...host, targetVerification: "verified" };
  assert.doesNotThrow(() => validateSnapshot({ ...document, tasks: [host] }));
  assert.throws(() => validateSnapshot({ ...document, tasks: [{ ...host, targetVerification: "pending-raw" }] }));
  assert.equal(taskView([host], { ...defaults, verification: "host-checked" }).matches.length, 1);
  assert.equal(taskView([host], { ...defaults, verification: "target-not-run" }).matches.length, 1);
  assert.equal(taskView([host], { ...defaults, verification: "target-verified" }).matches.length, 0);
  assert.equal(taskView([both], { ...defaults, verification: "target-verified" }).matches.length, 1);
  assert.equal(taskView([host], { ...defaults, q: host.summary }).matches.length, 0);
});
