export const workstreams = { kernel: "Kernel", server: "Server", desktop: "Desktop" };
export const statuses = {
  implemented: "Implemented", "in-progress": "In progress", todo: "To do", unclear: "Status unclear",
};
export const verificationStates = {
  "not-run": "Not run",
  "host-checked": "Host checks passed",
  "target-verified": "Target verified",
  failed: "Verification failed",
  unknown: "Verification unclear",
};
export const targetVerificationStates = {
  "target-not-run": "Target checks not run", "target-failed": "Target checks failed",
};
export const verificationFilters = { ...verificationStates, ...targetVerificationStates };
export const designStates = {
  ready: "Design ready", conditional: "Design conditional",
  incomplete: "Design incomplete", unknown: "Design readiness unclear",
};
export const defaults = { workstream: "all", status: "all", verification: "all", q: "" };

function withFallback(value, options) {
  return Object.hasOwn(options, value) ? value : "all";
}

export function readFilters(params) {
  const statusOptions = { ...statuses, blocked: "Blocked" };
  return {
    workstream: withFallback(params.get("workstream"), workstreams),
    status: withFallback(params.get("status"), statusOptions),
    verification: withFallback(params.get("verification"), verificationFilters),
    q: (params.get("q") ?? "").slice(0, 160),
  };
}

export function writeFilters(params, filters) {
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (filters[key] === defaultValue) params.delete(key);
    else params.set(key, filters[key]);
  }
  return params;
}

export function matchesVerification(task, verification) {
  return verification === "all" || task.verification === verification ||
    (task.targetVerification ? "target-" + task.targetVerification === verification : false);
}

export function taskView(tasks, filters) {
  const words = filters.q.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  const scoped = tasks.filter(task => filters.workstream === "all" || task.workstream === filters.workstream);
  const counts = { implemented: 0, "in-progress": 0, todo: 0, unclear: 0, blocked: 0 };
  for (const task of scoped) {
    counts[task.status]++;
    if (task.blocked) counts.blocked++;
  }
  const matches = scoped.filter(task => {
    const statusMatches = filters.status === "all" ||
      (filters.status === "blocked" ? task.blocked : task.status === filters.status);
    const verificationMatches = matchesVerification(task, filters.verification);
    const text = [task.id, task.title].join(" ").toLowerCase();
    return statusMatches && verificationMatches && words.every(word => text.includes(word));
  });
  return { matches, counts, total: scoped.length };
}

function objectWithKeys(value, keys) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function validText(value, limit) {
  return typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= limit &&
    !/[\u0000-\u001f\u007f]/u.test(value);
}

function publicLink(link) {
  if (!objectWithKeys(link, ["label", "url"]) || !validText(link.label, 60) || !validText(link.url, 250)) return false;
  try {
    const url = new URL(link.url);
    return url.origin === "https://github.com" && !url.username && !url.password &&
      /^\/imagine-engineering\/rust-linux-build(?:\/|$)/u.test(url.pathname);
  } catch {
    return false;
  }
}

export function validateSnapshot(snapshot) {
  if (!objectWithKeys(snapshot, ["schema", "snapshotUpdatedAt", "tasks"]) ||
      snapshot.schema !== "rust-linux-build.snapshot/v1" || !Array.isArray(snapshot.tasks)) {
    throw new Error("Invalid public snapshot format");
  }
  const timestamp = snapshot.snapshotUpdatedAt;
  if (timestamp === null ? snapshot.tasks.length > 0 :
      typeof timestamp !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/u.test(timestamp) ||
      Number.isNaN(Date.parse(timestamp)) || new Date(timestamp).toISOString().replace(".000Z", "Z") !== timestamp) {
    throw new Error("Invalid public snapshot timestamp");
  }
  const seen = new Set();
  for (const task of snapshot.tasks) {
    const keys = ["id", "workstream", "title", "status", "blocked", "verification", "design", "links"];
    if (task && Object.hasOwn(task, "summary")) keys.push("summary");
    if (task && Object.hasOwn(task, "targetVerification")) keys.push("targetVerification");
    if (!objectWithKeys(task, keys) ||
        (keys.includes("targetVerification") && !["not-run", "verified", "failed"].includes(task.targetVerification)) ||
        !Object.hasOwn(workstreams, task.workstream) || typeof task.id !== "string" ||
        !/^(kernel|server|desktop)-\d{3,6}$/u.test(task.id) || !task.id.startsWith(task.workstream + "-") || seen.has(task.id) ||
        !validText(task.title, 110) || (keys.includes("summary") && !validText(task.summary, 360)) ||
        !Object.hasOwn(statuses, task.status) || typeof task.blocked !== "boolean" ||
        (task.blocked && task.status === "implemented") ||
        !Object.hasOwn(verificationStates, task.verification) ||
        (task.design !== null && !Object.hasOwn(designStates, task.design)) ||
        !Array.isArray(task.links) || task.links.length > 4 || !task.links.every(publicLink)) {
      throw new Error("Invalid or duplicate task in public snapshot");
    }
    seen.add(task.id);
  }
  return snapshot;
}
