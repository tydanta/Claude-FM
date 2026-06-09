import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const appSource = fs.readFileSync(path.join(repoRoot, "src/server/app.js"), "utf8");
const routeRegistrationSource = fs.existsSync(path.join(repoRoot, "src/server/route-registration.js"))
  ? fs.readFileSync(path.join(repoRoot, "src/server/route-registration.js"), "utf8")
  : "";
const appContextSource = fs.existsSync(path.join(repoRoot, "src/server/app-context.js"))
  ? fs.readFileSync(path.join(repoRoot, "src/server/app-context.js"), "utf8")
  : "";

assert.match(appSource, /registerApiRoutes/, "app.js should delegate API route registration");
assert.ok(
  !appSource.includes('from "./routes/health-routes.js"'),
  "app.js should not import individual route modules directly"
);
assert.match(
  routeRegistrationSource,
  /export function registerApiRoutes/,
  "route-registration.js should export registerApiRoutes"
);
assert.match(
  routeRegistrationSource,
  /registerHealthRoutes/,
  "route-registration.js should own individual route registration imports"
);
assert.match(appSource, /createAppContext/, "app.js should delegate server context creation");
assert.ok(
  !appSource.includes('from "./database.js"'),
  "app.js should not import database setup directly"
);
assert.match(
  appContextSource,
  /export function createAppContext/,
  "app-context.js should export createAppContext"
);

console.log("server-route-registration-shell tests passed");
