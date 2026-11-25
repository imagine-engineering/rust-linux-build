import { cp, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateSnapshot } from "../site/assets/model.mjs";

const input = new URL("../site/", import.meta.url);
const output = new URL("../dist/", import.meta.url);
const files = [
  "index.html", "assets/site.css", "assets/dashboard.mjs", "assets/model.mjs", "data/snapshot.json",
];
validateSnapshot(JSON.parse(await readFile(new URL("data/snapshot.json", input), "utf8")));
await mkdir(output, { recursive: true });
for (const file of files) {
  await cp(new URL(file, input), new URL(file, output));
}
console.log(`Built dashboard in ${fileURLToPath(output)}`);
