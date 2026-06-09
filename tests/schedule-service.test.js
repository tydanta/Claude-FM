import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createScheduleService } from "../src/server/schedule-service.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-schedule-"));

try {
  const service = createScheduleService({ dataDir: tempDir });

  assert.deepEqual(await service.getSchedule(), [
    { time: "09:00", title: "整理今日任务", energy: "warm-up" },
    { time: "10:30", title: "深度工作", energy: "focus" },
    { time: "15:00", title: "回消息和轻任务", energy: "light" },
    { time: "21:30", title: "复盘与放松", energy: "downshift" }
  ]);

  await writeFile(path.join(tempDir, "schedule.json"), JSON.stringify([{ time: "11:00", title: "saved", energy: "focus" }]), "utf8");
  assert.deepEqual(await service.getSchedule(), [{ time: "11:00", title: "saved", energy: "focus" }]);

  const longTitle = "T".repeat(100);
  const longEnergy = "E".repeat(60);
  const saved = await service.saveSchedule([
    { time: " 10:30:45-extra ", title: ` ${longTitle} `, energy: ` ${longEnergy} ` },
    { time: "", title: "", energy: "" },
    ...Array.from({ length: 20 }, (_, index) => ({ time: `12:${String(index).padStart(2, "0")}`, title: `task-${index}`, energy: "light" }))
  ]);

  assert.equal(saved.length, 12);
  assert.deepEqual(saved[0], {
    time: "10:30:45",
    title: "T".repeat(80),
    energy: "E".repeat(40)
  });
  assert.deepEqual(saved[1], { time: "12:00", title: "task-0", energy: "light" });
  assert.deepEqual(JSON.parse(await readFile(path.join(tempDir, "schedule.json"), "utf8")), saved);

  assert.deepEqual(await service.saveSchedule([]), [
    { time: "09:00", title: "整理今日任务", energy: "warm-up" }
  ]);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("schedule-service tests passed");
