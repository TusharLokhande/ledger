#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const featureName = process.argv[2];

if (!featureName) {
  console.error("Usage: npm run gen <feature-name>");
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(featureName)) {
  console.error("Feature name must be kebab-case, e.g. product-catalog");
  process.exit(1);
}

const featureRoot = path.resolve(__dirname, "../src/features", featureName);

if (existsSync(featureRoot)) {
  console.error(`Feature "${featureName}" already exists at ${featureRoot}`);
  process.exit(1);
}

const dirs = [
  "api",
  "components",
  "hooks/queries",
  "hooks/mutations",
  "schemas",
  "types",
  "pages",
  "constants",
];

for (const dir of dirs) {
  mkdirSync(path.join(featureRoot, dir), { recursive: true });
}

writeFileSync(path.join(featureRoot, "index.ts"), "export {};\n");

console.log(`Feature "${featureName}" scaffolded at src/features/${featureName}`);
