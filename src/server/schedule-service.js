import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const defaultSchedule = [
  { time: "09:00", title: "整理今日任务", energy: "warm-up" },
  { time: "10:30", title: "深度工作", energy: "focus" },
  { time: "15:00", title: "回消息和轻任务", energy: "light" },
  { time: "21:30", title: "复盘与放松", energy: "downshift" }
];

export function createScheduleService({ dataDir }) {
  async function getSchedule() {
    const file = path.join(dataDir, "schedule.json");
    if (!existsSync(file)) {
      return defaultSchedule.map((item) => ({ ...item }));
    }
    return JSON.parse(await readFile(file, "utf8"));
  }

  async function saveSchedule(schedule = []) {
    const items = (Array.isArray(schedule) ? schedule : [])
      .map((item) => ({
        time: String(item?.time || "").trim().slice(0, 8),
        title: String(item?.title || "").trim().slice(0, 80),
        energy: String(item?.energy || "").trim().slice(0, 40)
      }))
      .filter((item) => item.time || item.title || item.energy)
      .slice(0, 12);
    const normalized = items.length
      ? items
      : [{ time: "09:00", title: "整理今日任务", energy: "warm-up" }];
    await mkdir(dataDir, { recursive: true });
    await writeFile(path.join(dataDir, "schedule.json"), JSON.stringify(normalized, null, 2), "utf8");
    return normalized;
  }

  return {
    getSchedule,
    saveSchedule
  };
}
