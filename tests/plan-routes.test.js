import assert from "node:assert/strict";
import { registerPlanRoutes } from "../src/server/routes/plan-routes.js";
import { createRouter } from "../src/server/router.js";

const sent = [];
const calls = [];
const router = createRouter();

registerPlanRoutes(router, {
  getTodayKey: () => "2026-06-03",
  getSchedule: async () => [{ title: "focus" }],
  saveSchedule: async (schedule) => {
    calls.push(["saveSchedule", schedule]);
    return schedule.map((item) => ({ ...item, saved: true }));
  },
  parseBody: async (req) => req.body,
  sendJson: (res, status, payload) => sent.push({ status, payload })
});

await router.handle({
  req: { method: "GET" },
  res: {},
  url: new URL("http://localhost/api/plan/today")
});

await router.handle({
  req: { method: "POST", body: { schedule: [{ title: "write" }] } },
  res: {},
  url: new URL("http://localhost/api/plan/today")
});

assert.deepEqual(sent, [
  {
    status: 200,
    payload: { date: "2026-06-03", schedule: [{ title: "focus" }] }
  },
  {
    status: 200,
    payload: { ok: true, date: "2026-06-03", schedule: [{ title: "write", saved: true }] }
  }
]);
assert.deepEqual(calls, [["saveSchedule", [{ title: "write" }]]]);

console.log("plan-routes tests passed");
