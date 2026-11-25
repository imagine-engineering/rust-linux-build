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

1. In the private environment, load the current milestone and task specs from the planning checkout. Join their task IDs with the owning implementation checkout, reviewed receipts, handoffs, and test records. Record each task once. Resolve conflicts and check one representative row per workstream against its source.
2. Prepare a small candidate from the approved tasks. Assign each task a stable public alias. Keep the alias mapping, provenance, raw records, and both source checkouts in the private environment.
3. Review the exact outbound task IDs, titles, summaries, statuses, verification and design labels, links, and UTC timestamp. Approve the public wording and link targets. Check links in a signed-out session. The initial link allowlist accepts only this public repository. Update it with separately reviewed public locations if needed.
4. Copy the reviewed export to `site/data/snapshot.json`. Run `node --test` and `node scripts/build.mjs`. Review the staged JSON diff and commit it to `main` through the normal repository workflow.
5. Check the Pages deployment run and open the public site. Confirm the updated timestamp, one row from each included workstream, and the new counts. GitHub Actions packages only the static site files listed in the build script.

The strict snapshot schema is defined in `site/assets/model.mjs`. Snapshot timestamps are UTC with second precision. The refresh is driven by reviewed commits. This keeps source credentials and access out of the public workflow.

## Local development

Use Node.js 24 or newer. Run `node --test`, then `node scripts/build.mjs`. Serve `dist/` using a static HTTP server, for example `python3 -m http.server 8000 --directory dist`, and open `http://localhost:8000/`.

## Contributions

When public intake opens, add a separate Contributions view for public GitHub Issues, labels, and linked pull requests. Link to a snapshot task through its explicit public task ID. GitHub state governs contribution intake. Implementation progress continues to follow the spec and evidence process above.
