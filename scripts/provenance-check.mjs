import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const scanRoots = ["src", "docs", "scripts"];
const forbiddenPatterns = [
  /\bAGPL frontend source\b/i,
  /\bweb\/default\b/i,
  /\brouteTree\.gen\b/,
  /\bsemi-ui\b/i,
  /\bnew-api frontend\b/i,
];

const allowedFiles = new Set([
  "docs/clean-room-policy.md",
  "docs/provenance-checklist.md",
  "docs/backend-endpoint-inventory.md",
  "docs/deployment.md",
  "docs/implementation-roadmap.md",
  "docs/release-checklist.md",
  "scripts/provenance-check.mjs",
]);

function walk(dir) {
  const result = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      result.push(...walk(fullPath));
    } else {
      result.push(fullPath);
    }
  }

  return result;
}

const findings = [];

for (const scanRoot of scanRoots) {
  const files = walk(join(root, scanRoot));

  for (const file of files) {
    const relativePath = relative(root, file).replaceAll("\\", "/");

    if (allowedFiles.has(relativePath)) {
      continue;
    }

    const content = readFileSync(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        findings.push(`${relativePath}: matched ${pattern}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Potential provenance issues found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Provenance text scan passed.");
