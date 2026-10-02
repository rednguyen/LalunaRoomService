import { readFile, writeFile } from "node:fs/promises";

const STATE_PATH = new URL("../state/last-run.json", import.meta.url);
const MAX_TRACKED_IDS = 100;

export async function loadState() {
  try {
    const raw = await readFile(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { postedIds: Array.isArray(parsed.postedIds) ? parsed.postedIds : [] };
  } catch (err) {
    if (err.code === "ENOENT") return { postedIds: [] };
    throw err;
  }
}

export async function saveState(state) {
  const trimmed = {
    postedIds: state.postedIds.slice(-MAX_TRACKED_IDS),
    lastRunAt: new Date().toISOString()
  };
  await writeFile(STATE_PATH, JSON.stringify(trimmed, null, 2) + "\n", "utf-8");
}
