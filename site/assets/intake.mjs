const repo = "imagine-engineering/rust-linux-build";
const api = `https://api.github.com/repos/${repo}`;
const linkedTask = /(?:^|\n)Task:\s*((?:kernel|server|desktop)-\d{3,6})[ \t]*(?=\r?$)/gmi;
const closesIssue = /\b(?:clos(?:e|es|ed)|fix(?:es|ed)?|resolv(?:e|es|ed))\s+#(\d+)\b/gi;

export function mapContributions(issues, pulls, taskIds) {
  const result = new Map();
  const issueTasks = new Map();
  const known = new Set(taskIds);

  function add(task, item, kind) {
    if (!known.has(task) || !Number.isSafeInteger(item.number) || item.number < 1) return;
    if (!result.has(task)) result.set(task, { items: new Map(), contributors: new Set(), labels: new Set() });
    const record = result.get(task);
    const key = `${kind} #${item.number}`;
    record.items.set(key, `https://github.com/${repo}/${kind === "Issue" ? "issues" : "pull"}/${item.number}`);
    if (typeof item.user?.login === "string") record.contributors.add(item.user.login);
    for (const label of item.labels ?? []) {
      if (typeof label.name === "string") record.labels.add(label.name);
    }
  }

  for (const issue of issues) {
    if (issue.pull_request) continue;
    const tasks = [...(issue.body ?? "").matchAll(linkedTask)].map(match => match[1].toLowerCase());
    issueTasks.set(issue.number, tasks);
    for (const task of tasks) add(task, issue, "Issue");
  }
  for (const pull of pulls) {
    const tasks = new Set();
    for (const match of (pull.body ?? "").matchAll(linkedTask)) tasks.add(match[1].toLowerCase());
    for (const match of (pull.body ?? "").matchAll(closesIssue)) {
      for (const task of issueTasks.get(Number(match[1])) ?? []) tasks.add(task);
    }
    for (const task of tasks) add(task, pull, "PR");
  }
  return result;
}

async function list(path) {
  const entries = [];
  let url = `${api}/${path}?state=all&per_page=100`;
  while (url) {
    const response = await fetch(url, { credentials: "omit" });
    if (!response.ok) throw new Error("Public contribution data is unavailable");
    entries.push(...await response.json());
    const next = /<([^>]+)>; rel="next"/.exec(response.headers.get("Link") ?? "");
    url = next?.[1]?.startsWith(api + "/") ? next[1] : null;
  }
  return entries;
}

export async function loadContributions(taskIds) {
  const config = await fetch(new URL("../data/intake.json", import.meta.url));
  if (!config.ok || (await config.json()).enabled !== true) return null;
  const response = await fetch(api, { credentials: "omit" });
  if (!response.ok) throw new Error("Public contribution data is unavailable");
  const repoState = await response.json();
  if (repoState.private !== false || repoState.has_issues !== true) return null;
  const [issues, pulls] = await Promise.all([list("issues"), list("pulls")]);
  return mapContributions(issues, pulls, taskIds);
}
