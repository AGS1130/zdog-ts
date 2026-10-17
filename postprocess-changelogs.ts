import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SECTION_MAP: Record<string, string> = {
  "Major Changes": "Changed",
  "Minor Changes": "Added",
  "Patch Changes": "Fixed"
};

const SEMVER_HEADING_RE =
  /## (\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)\n/g;

const CHANGESET_SECTION_HEADING_RE = /### (Major|Minor|Patch) Changes\n/g;

function formatChangelog(content: string): string {
  const date = new Date().toISOString().split("T")[0];
  return content
    .replace(SEMVER_HEADING_RE, (_, version) => `## [${version}] - ${date}\n`)
    .replace(CHANGESET_SECTION_HEADING_RE, (_, type) => `### ${SECTION_MAP[`${type} Changes`]}\n`);
}

const CHANGELOG_PATH = join("./CHANGELOG.md");
if (existsSync(CHANGELOG_PATH)) {
  const content = readFileSync(CHANGELOG_PATH, "utf-8");
  const formatted = formatChangelog(content);
  if (formatted !== content) {
    writeFileSync(CHANGELOG_PATH, formatted);
  }
}
