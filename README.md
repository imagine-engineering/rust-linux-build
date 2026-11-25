# Rust Linux Build

Rust Linux Build is a public GitHub Pages dashboard for the Kernel, Server, and Desktop workstreams. Its totals describe the approved snapshot. Each workstream can be selected independently, and the URL preserves the active filters.

## Status and sources

| Field | Authority |
| --- | --- |
| Task scope and ownership | Kernel milestone manifests and task specs, the Server task spec, and the Desktop milestone registry and task spec. Roll up distinct task IDs. Milestones are grouping records. |
| Implemented | Reviewed implementation evidence matching the task and its committed deliverable or admitted completion receipt. The claim applies to the task's scope. |
| In progress | A current work order, active assignment, or reviewed checkpoint showing actual work on the task. |
| To do | The task spec records pending work and the evidence review finds no later implementation or activity record. |
| Status unclear | Records disagree, a completion marker lacks corroborating evidence, or the scope or recency cannot be reconciled. |
| Blocked | An explicit, current blocker from the task owner or evidence handoff. It can accompany To do, In progress, or Status unclear. |
| Design and verification | Design decisions, qualification records, and test receipts govern these independently. Host fixture checks and target verification are separate states. |

Reconcile evidence against the applicable task, workstream, commit, and verification scope. Exact, corroborated implementation or activity evidence takes precedence over a generic planning summary or an older checkbox. A failed or missing verification record affects verification. Re-open or flag a completion conflict when authoritative evidence shows the implementation itself is absent or its receipt is stale.

## Refresh the public snapshot

The private refresh verifies the governing task and evidence against the owning repository. It can update implementation stage and the separately recorded host and target verification for approved task IDs. Its output is restricted to the public snapshot schema and a single compare-and-swap update of `site/data/snapshot.json`.

New rows, public wording, links, blocker flags, and design labels require separate review. The approved public task IDs remain stable. The private workflow records failures and leaves the last successful Pages deployment available. Replaying a refresh uses the current private records and the current public file.

For public changes, review the exact snapshot diff, run `node --test` and `node scripts/build.mjs`, and check the Pages workflow and signed-out site after merging. Times are UTC. The snapshot timestamp advances when the private publisher changes an approved field.

## Local development

Use Node.js 24 or newer. Run `node --test`, then `node scripts/build.mjs`. Serve `dist/` using a static HTTP server, for example `python3 -m http.server 8000 --directory dist`, and open `http://localhost:8000/`.

## Contributions

Public intake requires both Issues enabled in repository settings and a reviewed change to set `enabled` in `site/data/intake.json`. Public issues and pull requests relate to dashboard tasks through a standalone `Task: kernel-001` line, or through a PR’s closing reference to a linked issue. The dashboard then shows contributor and label filters, linked issues and PRs, and a New issue link. Implementation progress continues to follow the spec and evidence process above.

Design tokens and component patterns were adapted from the authorized Snippet Manager template. The Geist Mono font and Lucide icons carry their respective [OFL](site/assets/geist-OFL.txt) and [license](site/assets/lucide-LICENSE.txt).
