import assert from "node:assert/strict";
import test from "node:test";
import { mapContributions } from "../site/assets/intake.mjs";

test("associates public contributions by explicit task and issue links without changing progress", () => {
  const issue = { number: 1, body: "Task: kernel-001", labels: [{ name: "testing" }], user: { login: "example" } };
  const stray = { ...issue, number: 2, body: "A reference to kernel-001 in prose" };
  const elsewhere = { ...issue, number: 3, body: "Task: server-002" };
  const pull = { number: 4, body: "Closes #1", user: { login: "helper" } };
  const tasks = mapContributions([issue, stray, elsewhere], [pull], ["kernel-001"]);
  assert.deepEqual([...tasks.keys()], ["kernel-001"]);
  assert.deepEqual([...tasks.get("kernel-001").items.keys()], ["Issue #1", "PR #4"]);
  assert.deepEqual([...tasks.get("kernel-001").contributors], ["example", "helper"]);
  assert.deepEqual([...tasks.get("kernel-001").labels], ["testing"]);
});
