import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const defaultSourceGlobs = [
  "public/index.html",
  "public/app.js",
  "public/modules/**/*.js",
  "src/**/*.jsx",
  "src/**/*.js"
];

const defaultSafelist = [
  /^is-/,
  /^has-/,
  /^data-/,
  /^sr-only$/,
  /^hidden$/,
  /^active$/,
  /^visible$/,
  /^playing$/,
  /^current$/,
  /^light$/,
  /^dark$/,
  /^custom$/,
  /^radio$/,
  /^mine$/,
  /^settings$/,
  /^player$/,
  /^artist$/,
  /^songs$/,
  /^albums$/,
  /^order$/,
  /^random$/,
  /^loop$/,
  /^repeat$/,
  /^standard$/,
  /^higher$/,
  /^exhigh$/,
  /^lossless$/,
  /^hires$/,
  /^liquid-/,
  /^\.liquid-nav-root\s+\./,
  /^\.liquid-theme-root\s+\./,
  /^body(?:\[data-theme="[^"]+"\])?\[data-surface="liquid"\]\s+\.topbar\s+>\s+#liquidThemeToggleRoot/,
  /^glass/,
  /^weather-/,
  /^northern-/,
  /^artist-/,
  /^player-/,
  /^queue-/,
  /^playlist-/,
  /^netease-/,
  /^claudio-/,
  /^recommend-/,
  /^collect-/,
  /^search-/,
  /^mine-/,
  /^settings-/
];

function walkFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return [fullPath];
  });
}

function expandSourceGlobs(globs = defaultSourceGlobs) {
  const files = new Set();
  for (const glob of globs) {
    if (glob.endsWith("/**/*.js")) {
      const dir = path.join(repoRoot, glob.slice(0, -"**/*.js".length));
      walkFiles(dir).filter((file) => file.endsWith(".js")).forEach((file) => files.add(file));
      continue;
    }
    if (glob.endsWith("/**/*.jsx")) {
      const dir = path.join(repoRoot, glob.slice(0, -"**/*.jsx".length));
      walkFiles(dir).filter((file) => file.endsWith(".jsx")).forEach((file) => files.add(file));
      continue;
    }
    const fullPath = path.join(repoRoot, glob);
    if (fs.existsSync(fullPath)) files.add(fullPath);
  }
  return [...files].sort();
}

export function extractReferencedTokens(sources = []) {
  const classes = new Set();
  const ids = new Set();
  const classTokenPattern = /^[A-Za-z_-][A-Za-z0-9_-]*$/;
  const addClassToken = (value) => {
    const token = String(value || "").trim();
    if (classTokenPattern.test(token)) classes.add(token);
  };
  const addClasses = (value) => String(value || "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach(addClassToken);
  const addClassExpression = (value) => {
    const source = String(value || "");
    addClasses(source.split(/\$\{/)[0]);
    addClasses(source.replace(/\$\{[\s\S]*?\}/g, " "));
    for (const match of source.matchAll(/["'`]([^"'`]*\s+[A-Za-z_-][A-Za-z0-9_-][^"'`]*)["'`]/g)) {
      addClasses(match[1]);
    }
  };

  for (const source of sources) {
    for (const match of source.matchAll(/\bclass(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g)) {
      addClassExpression(match[1]);
    }
    for (const match of source.matchAll(/\bclass(?:Name)?\s*=\s*\{\s*`([\s\S]*?)`\s*\}/g)) {
      addClassExpression(match[1]);
    }
    for (const match of source.matchAll(/\bclassName\s*:\s*["'`]([^"'`]+)["'`]/g)) {
      addClassExpression(match[1]);
    }
    for (const match of source.matchAll(/\bclassList\.(?:add|remove|toggle|contains)\(\s*["'`]([^"'`]+)["'`]/g)) {
      addClassToken(match[1]);
    }
    for (const match of source.matchAll(/\bclassName\s*=\s*["'`]([^"'`]+)["'`]/g)) {
      addClassExpression(match[1]);
    }
    for (const match of source.matchAll(/["'`]\s+([A-Za-z_-][A-Za-z0-9_-]*-[A-Za-z0-9_-]*)["'`]/g)) {
      addClassToken(match[1]);
    }
    for (const match of source.matchAll(/\bid\s*=\s*["'`]([^"'`]+)["'`]/g)) {
      ids.add(match[1]);
    }
    for (const match of source.matchAll(/querySelector(?:All)?\(\s*["'`]#([A-Za-z0-9_-]+)["'`]/g)) {
      ids.add(match[1]);
    }
    for (const match of source.matchAll(/querySelector(?:All)?\(\s*["'`]\.([A-Za-z0-9_-]+)["'`]/g)) {
      classes.add(match[1]);
    }
    for (const match of source.matchAll(/dataset\.([A-Za-z0-9_]+)/g)) {
      classes.add(match[1].replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));
    }
  }

  return { classes, ids };
}

export function extractCssSelectors(css = "") {
  const selectors = [];
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const block of withoutComments.matchAll(/([^{]+)\{/g)) {
    const rawSelector = block[1].slice(Math.max(block[1].lastIndexOf("}"), block[1].lastIndexOf(";")) + 1).trim();
    if (!rawSelector || rawSelector.startsWith("@")) continue;
    const selectorList = rawSelector
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean);
    for (const selector of selectorList) {
      for (const match of selector.matchAll(/\.([A-Za-z0-9_-]+)/g)) {
        selectors.push({ type: "class", token: match[1], selector });
      }
      for (const match of selector.matchAll(/#([A-Za-z0-9_-]+)/g)) {
        selectors.push({ type: "id", token: match[1], selector });
      }
    }
  }
  return selectors;
}

export function auditCssSelectors({
  css,
  sources,
  safelist = defaultSafelist
}) {
  const referenced = extractReferencedTokens(sources);
  const selectors = extractCssSelectors(css);
  const seen = new Set();
  const used = [];
  const unused = [];

  for (const selector of selectors) {
    const key = `${selector.type}:${selector.token}:${selector.selector}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const isReferenced = selector.type === "class"
      ? referenced.classes.has(selector.token)
      : referenced.ids.has(selector.token);
    const isSafe = safelist.some((rule) => rule.test(selector.token) || rule.test(selector.selector));
    (isReferenced || isSafe ? used : unused).push(selector);
  }

  return { used, unused, referenced };
}

export function runCssAudit({
  cssPath = path.join(repoRoot, "public/styles.css"),
  sourceFiles = expandSourceGlobs(),
  failOnUnused = false
} = {}) {
  const css = fs.readFileSync(cssPath, "utf8");
  const sources = sourceFiles.map((file) => fs.readFileSync(file, "utf8"));
  const result = auditCssSelectors({ css, sources });
  const report = {
    cssPath,
    sourceFileCount: sourceFiles.length,
    usedSelectorCount: result.used.length,
    unusedSelectorCount: result.unused.length,
    unused: result.unused.slice(0, 120)
  };
  if (failOnUnused && result.unused.length) {
    const error = new Error(`Found ${result.unused.length} potentially unused CSS selectors.`);
    error.report = report;
    throw error;
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = runCssAudit({ failOnUnused: process.argv.includes("--fail-on-unused") });
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    if (error.report) console.error(JSON.stringify(error.report, null, 2));
    console.error(error.message);
    process.exit(1);
  }
}
