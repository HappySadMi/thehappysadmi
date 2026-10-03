/**
 * Generates worker/src/snapshot.js from the repository's data/*.json.
 *
 * This snapshot is a FALLBACK. The Worker prefers fetching the live site
 * content at request time (see knowledge.js); this only kicks in when that
 * fetch fails, so the bot degrades to slightly stale content rather than
 * breaking entirely.
 *
 * Run after editing any file in data/:
 *   node worker/scripts/build-knowledge.mjs
 *
 * Do NOT hand-edit worker/src/snapshot.js -- it is overwritten.
 */

import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const dataDir = join(repoRoot, "data");
const outFile = join(here, "..", "src", "snapshot.js");

const FILES = ["services", "portfolio", "team", "testimonials"];

function readJson(name) {
  return JSON.parse(readFileSync(join(dataDir, `${name}.json`), "utf8"));
}

let snapshot = {};
let failed = false;

for (const name of FILES) {
  try {
    snapshot[name] = readJson(name);
    console.log(`  ${name}.json  -> ${snapshot[name].length} entries`);
  } catch (error) {
    console.error(`  FAILED to read data/${name}.json: ${error.message}`);
    failed = true;
  }
}

if (failed) {
  console.error("\nAborting: snapshot not written, existing snapshot left untouched.");
  process.exit(1);
}

const generated = `/**
 * GENERATED FILE -- DO NOT EDIT.
 *
 * Built from data/*.json by worker/scripts/build-knowledge.mjs.
 * This is a fallback used only when the live site fetch fails.
 *
 * Regenerate with:  node worker/scripts/build-knowledge.mjs
 */

export default ${JSON.stringify(snapshot, null, 2)};
`;

await writeFile(outFile, generated, "utf8");

const bytes = Buffer.byteLength(generated);
console.log(`\nWrote ${outFile}`);
console.log(`  ${(bytes / 1024).toFixed(1)} KB`);