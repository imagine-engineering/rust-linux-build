import {
  defaults, designStates, matchesVerification, readFilters, statuses, taskView, validateSnapshot,
  verificationFilters, verificationStates, workstreams, writeFilters,
} from "./model.mjs";
import { loadContributions } from "./intake.mjs";

const get = id => document.getElementById(id);
const search = get("search");
const list = get("task-list");
const rail = get("rail");
const railToggle = get("rail-toggle");
const dialog = get("detail");
const statusFilter = get("status-filter");
const verificationFilter = get("verification-filter");
const clear = get("clear");
const contributor = get("contributor");
const issueLabel = get("issue-label");
const stages = ["todo", "in-progress", "implemented"];
const stageMarks = { todo: "circle", "in-progress": "active", implemented: "check", unclear: "unclear" };
const labels = { ...statuses, blocked: "Blocked" };
const media = matchMedia("(max-width: 43rem)");

let snapshot;
let filter = readFilters(new URLSearchParams(location.search));
let contributions = null;
let detailTrigger;
const workstreamControls = new Map();
const stageControls = new Map();
const flagControls = new Map();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(status) {
  const node = element("span", `state-icon ${status}`);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS(svg.namespaceURI, "use");
  use.setAttribute("href", `./assets/icons.svg#${stageMarks[status]}`);
  svg.classList.add("glyph");
  svg.append(use);
  node.append(svg);
  node.setAttribute("aria-hidden", "true");
  return node;
}

function button(className, onClick) {
  const node = element("button", className);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

function countButton(name, className, onClick, mark = null) {
  const control = button(className, onClick);
  const label = element("span", mark ? "stage-label" : "", "");
  if (mark) label.append(icon(mark));
  label.append(name);
  const count = element("span", "count", "—");
  control.append(label, count);
  return { control, count };
}

function setPanel(open) {
  rail.toggleAttribute("data-open", open);
  railToggle.setAttribute("aria-expanded", String(open));
}

function arrangePanel() {
  if (media.matches) rail.prepend(get("selectors"));
  else get("main").querySelector(".toolbar").insertBefore(get("selectors"), clear);
}
arrangePanel();
media.addEventListener("change", arrangePanel);
railToggle.addEventListener("click", () => setPanel(!rail.hasAttribute("data-open")));
rail.addEventListener("keydown", event => {
  if (event.key === "Escape" && media.matches && rail.hasAttribute("data-open")) {
    setPanel(false);
    railToggle.focus();
  }
});

function choice(select, data, all) {
  select.replaceChildren(new Option(all, "all"));
  for (const [value, label] of Object.entries(data)) select.add(new Option(label, value));
}

function update(changes) {
  filter = { ...filter, ...changes };
  const url = new URL(location.href);
  writeFilters(url.searchParams, filter);
  if (contributions) {
    for (const [key, choice] of [["contributor", contributor], ["label", issueLabel]]) {
      if (choice.value === "all") url.searchParams.delete(key);
      else url.searchParams.set(key, choice.value);
    }
  }
  history.replaceState(null, "", url);
  render();
}

function setupRail() {
  for (const [key, name] of Object.entries({ all: "All workstreams", ...workstreams })) {
    const entry = countButton(name, "", () => update({ workstream: key }));
    workstreamControls.set(key, entry);
    get("workstreams").append(entry.control);
  }
  for (const stage of stages) {
    const box = element("div", "stage");
    const head = element("div", "stage-head");
    const entry = countButton(statuses[stage], "stage-choice",
      () => update({ status: filter.status === stage ? "all" : stage }), stage);
    const breakdown = element("div", "breakdown");
    breakdown.id = `counts-${stage}`;
    const expand = button("expand", () => {
      breakdown.hidden = !breakdown.hidden;
      expand.setAttribute("aria-expanded", String(!breakdown.hidden));
    });
    breakdown.hidden = stage !== "todo";
    expand.setAttribute("aria-expanded", String(!breakdown.hidden));
    expand.setAttribute("aria-controls", breakdown.id);
    expand.setAttribute("aria-label", `${statuses[stage]} verification breakdown`);
    const options = new Map();
    for (const [key, name] of Object.entries(verificationFilters)) {
      const caption = key === "not-run" ? "Not run" : name;
      const item = countButton(caption, "", () => update({ status: stage, verification:
        filter.status === stage && filter.verification === key ? "all" : key }));
      options.set(key, item);
      breakdown.append(item.control);
    }
    const empty = element("p", "", "No tasks in this stage");
    breakdown.append(empty);
    head.append(entry.control, expand);
    box.append(head, breakdown);
    get("stages").append(box);
    stageControls.set(stage, { ...entry, options, empty });
  }
  for (const key of ["blocked", "unclear"]) {
    const entry = countButton(labels[key], "", () => update({ status: filter.status === key ? "all" : key }));
    flagControls.set(key, entry);
    get("flags").append(entry.control);
  }
}

function badges(task) {
  const entries = [element("span", `badge primary ${task.status}`, statuses[task.status])];
  if (task.blocked) entries.push(element("span", "badge blocked", "Blocked"));
  entries.push(element("span", "badge", verificationStates[task.verification]));
  if (task.targetVerification && task.verification !== `target-${task.targetVerification}`) {
    entries.push(element("span", "badge", verificationFilters[`target-${task.targetVerification}`]));
  }
  if (task.design) entries.push(element("span", "badge", designStates[task.design]));
  return entries;
}

function showDetail(task, trigger) {
  detailTrigger = trigger;
  get("detail-meta").textContent = `${task.id} · ${workstreams[task.workstream]}`;
  get("detail-title").textContent = task.title;
  get("detail-summary").textContent = task.summary;
  get("detail-badges").replaceChildren(...badges(task));
  const links = get("detail-links");
  const publicLinks = task.links.map(({ label, url }) => [label, url]);
  const supplemental = contributions?.get(task.id);
  links.replaceChildren(...[...publicLinks, ...(supplemental?.items ?? [])].map(([label, url]) => {
    const item = element("li");
    const link = element("a", "", label);
    link.href = url;
    item.append(link);
    return item;
  }));
  links.hidden = !links.childElementCount;
  dialog.showModal();
}
get("detail-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => detailTrigger?.focus());

function renderRow(task) {
  const row = get("task-template").content.firstElementChild.cloneNode(true);
  const control = row.querySelector("button");
  const supplemental = contributions?.get(task.id);
  row.querySelector(".state-icon").replaceWith(icon(task.status));
  row.querySelector(".task-title").textContent = task.title;
  const suffix = supplemental?.items.size ? ` · ${supplemental.items.size} GitHub links` : "";
  row.querySelector(".task-meta").textContent = `${task.id} · ${workstreams[task.workstream]}${suffix}`;
  row.querySelector(".task-badges").append(...badges(task));
  control.addEventListener("click", () => showDetail(task, control));
  return row;
}

function pressed(entry, active, count) {
  entry.control.setAttribute("aria-pressed", String(active));
  entry.count.textContent = count;
}

function render() {
  const tasks = snapshot.tasks.filter(task => {
    if (!contributions) return true;
    const item = contributions.get(task.id);
    return (contributor.value === "all" || item?.contributors.has(contributor.value)) &&
      (issueLabel.value === "all" || item?.labels.has(issueLabel.value));
  });
  const { counts, matches, total } = taskView(tasks, filter);
  const scoped = tasks.filter(task => filter.workstream === "all" || task.workstream === filter.workstream);
  for (const [key, entry] of workstreamControls) {
    pressed(entry, filter.workstream === key, key === "all" ? tasks.length : tasks.filter(task => task.workstream === key).length);
  }
  for (const [key, entry] of stageControls) {
    pressed(entry, filter.status === key, counts[key]);
    const group = scoped.filter(task => task.status === key);
    for (const [verification, option] of entry.options) {
      const count = group.filter(task => matchesVerification(task, verification)).length;
      option.control.hidden = !count;
      pressed(option, filter.status === key && filter.verification === verification, count);
    }
    entry.empty.hidden = group.length > 0;
  }
  for (const [key, entry] of flagControls) pressed(entry, filter.status === key, counts[key]);

  if (search.value !== filter.q) search.value = filter.q;
  statusFilter.value = filter.status;
  verificationFilter.value = filter.verification;
  clear.disabled = Object.keys(defaults).every(key => filter[key] === defaults[key]) &&
    (!contributions || (contributor.value === "all" && issueLabel.value === "all"));

  get("result").textContent = `Showing ${matches.length} of ${total} ${total === 1 ? "task" : "tasks"}`;
  if (matches.length) {
    const rows = element("ul");
    rows.setAttribute("role", "list");
    rows.append(...matches.map(renderRow));
    list.replaceChildren(rows);
  } else {
    const text = snapshot.tasks.length ? "No tasks match these filters." : "No reviewed tasks have been published yet.";
    list.replaceChildren(element("p", "empty", text));
  }
}

function wireControls() {
  choice(statusFilter, labels, "All statuses");
  choice(verificationFilter, verificationFilters, "All verification");
  for (const field of [search, statusFilter, verificationFilter]) field.disabled = false;
  search.addEventListener("input", () => update({ q: search.value }));
  statusFilter.addEventListener("change", () => update({ status: statusFilter.value }));
  verificationFilter.addEventListener("change", () => update({ verification: verificationFilter.value }));
  clear.addEventListener("click", () => {
    if (contributions) contributor.value = issueLabel.value = "all";
    update(defaults);
    search.focus();
  });
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(location.search);
    filter = readFilters(params);
    if (contributions) restoreIntake(params);
    render();
  });
}

function restoreIntake(params) {
  for (const [key, select] of [["contributor", contributor], ["label", issueLabel]]) {
    select.value = params.get(key) ?? "all";
    if (!select.value) select.value = "all";
  }
}

async function setupIntake() {
  try {
    contributions = await loadContributions(snapshot.tasks.map(task => task.id));
    if (!contributions) return;
    for (const [kind, field] of [["contributors", contributor], ["labels", issueLabel]]) {
      const values = new Set([...contributions.values()].flatMap(item => [...item[kind]]));
      choice(field, Object.fromEntries([...values].sort().map(name => [name, name])),
        kind === "labels" ? "All issue labels" : "All contributors");
      field.addEventListener("change", () => update({}));
    }
    restoreIntake(new URLSearchParams(location.search));
    get("new-issue").hidden = false;
    get("intake-filters").hidden = false;
    render();
  } catch {
    const message = get("intake-message");
    message.textContent = "Public contribution data is temporarily unavailable.";
    message.hidden = false;
  }
}

async function start() {
  try {
    const response = await fetch(new URL("../data/snapshot.json", import.meta.url));
    if (!response.ok) throw new Error("Snapshot request failed");
    snapshot = validateSnapshot(await response.json());
    const date = get("snapshot-date");
    if (snapshot.snapshotUpdatedAt) {
      const time = element("time");
      time.dateTime = snapshot.snapshotUpdatedAt;
      time.textContent = new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
      }).format(new Date(time.dateTime)) + " UTC";
      date.replaceChildren("Snapshot updated ", time);
    } else date.textContent = "First snapshot awaiting publication";
    setupRail();
    wireControls();
    render();
    await setupIntake();
  } catch {
    get("snapshot-date").textContent = "Snapshot unavailable";
    list.replaceChildren(element("p", "empty", "The progress snapshot could not be loaded. Refresh to try again."));
  }
}
start();
