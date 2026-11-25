import {
  defaults, designStates, readFilters, statuses, taskView, validateSnapshot,
  verificationStates, workstreams, writeFilters,
} from "./model.mjs";

const picker = document.querySelector("#workstream-picker");
const metrics = [...document.querySelectorAll("button[data-status]")];
const query = document.querySelector("#search");
const status = document.querySelector("#status-filter");
const verification = document.querySelector("#verification-filter");
const clear = document.querySelector("#clear");
const date = document.querySelector("#snapshot-date");
const result = document.querySelector("#result");
const list = document.querySelector("#task-list");
const template = document.querySelector("#task-template");

let filters = readFilters(new URLSearchParams(location.search));

function message(copy) {
  const item = document.createElement("p");
  item.className = "empty";
  item.textContent = copy;
  return item;
}

function taskElement(task) {
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector("h3").textContent = task.title;
  row.querySelector("p").textContent = task.summary;
  const links = row.querySelector(".links");
  for (const { label, url } of task.links) {
    const link = document.createElement("a");
    link.textContent = label;
    link.href = url;
    links.append(link);
  }
  links.hidden = task.links.length === 0;
  const primary = row.querySelector(".primary");
  primary.textContent = statuses[task.status];
  primary.classList.add(task.status);
  row.querySelector(".blocked").hidden = !task.blocked;
  row.querySelector(".verification").textContent = verificationStates[task.verification];
  const design = row.querySelector(".design");
  design.hidden = task.design === null;
  if (task.design !== null) design.textContent = designStates[task.design];
  return row;
}

function table(matches) {
  const heading = document.createElement("div");
  heading.className = "task-heading";
  for (const label of ["Task", "Status", "Verification and design"]) {
    const cell = document.createElement("span");
    cell.textContent = label;
    heading.append(cell);
  }
  const items = document.createElement("ul");
  items.setAttribute("role", "list");
  for (const task of matches) {
    const row = taskElement(task);
    if (filters.workstream === "all") {
      const stream = document.createElement("span");
      stream.className = "stream-label";
      stream.textContent = workstreams[task.workstream];
      row.querySelector(".task-main").prepend(stream);
    }
    items.append(row);
  }
  return [heading, items];
}

function render(snapshot) {
  const { matches, counts, total } = taskView(snapshot.tasks, filters);
  for (const metric of metrics) {
    metric.querySelector("strong").textContent = counts[metric.dataset.status];
    metric.setAttribute("aria-pressed", String(metric.dataset.status === filters.status));
  }
  picker.querySelector(`input[value="${filters.workstream}"]`).checked = true;
  if (query.value !== filters.q) query.value = filters.q;
  status.value = filters.status;
  verification.value = filters.verification;
  clear.disabled = Object.keys(defaults).every(key => filters[key] === defaults[key]);
  result.textContent = `Showing ${matches.length} of ${total} ${total === 1 ? "task" : "tasks"}`;

  if (matches.length) list.replaceChildren(...table(matches));
  else if (!snapshot.tasks.length) list.replaceChildren(message("No reviewed tasks have been published yet."));
  else if (!total) list.replaceChildren(message("No reviewed tasks are published for this workstream."));
  else list.replaceChildren(message("No tasks match these filters."));
}

function attachFilters(snapshot) {
  function update(changes) {
    filters = { ...filters, ...changes };
    const url = new URL(location.href);
    writeFilters(url.searchParams, filters);
    history.replaceState(null, "", url);
    render(snapshot);
  }
  picker.addEventListener("change", event => update({ workstream: event.target.value }));
  query.addEventListener("input", () => update({ q: query.value.slice(0, 160) }));
  status.addEventListener("change", () => update({ status: status.value }));
  verification.addEventListener("change", () => update({ verification: verification.value }));
  clear.addEventListener("click", () => {
    update(defaults);
    query.focus();
  });
  for (const metric of metrics) {
    metric.addEventListener("click", () => {
      update({ status: metric.dataset.status === filters.status ? "all" : metric.dataset.status });
    });
  }
  for (const control of [picker, query, status, verification, ...metrics]) control.disabled = false;
  window.addEventListener("popstate", () => {
    filters = readFilters(new URLSearchParams(location.search));
    render(snapshot);
  });
}

async function start() {
  try {
    const response = await fetch(new URL("../data/snapshot.json", import.meta.url));
    if (!response.ok) throw new Error("Snapshot request failed");
    const snapshot = validateSnapshot(await response.json());
    if (snapshot.snapshotUpdatedAt) {
      const time = document.createElement("time");
      time.dateTime = snapshot.snapshotUpdatedAt;
      time.textContent = new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
      }).format(new Date(time.dateTime)) + " UTC";
      date.replaceChildren("Snapshot updated ", time);
    } else {
      date.textContent = "First snapshot awaiting publication";
    }
    attachFilters(snapshot);
    render(snapshot);
  } catch {
    date.textContent = "Snapshot unavailable";
    list.replaceChildren(message("The progress snapshot could not be loaded. Refresh to try again."));
  }
}
start();
