import { rm } from "node:fs/promises";

export async function removeTempDir(tempDir) {
  try {
    await rm(tempDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  } catch (error) {
    if (!["EBUSY", "ENOTEMPTY", "EPERM"].includes(error?.code)) {
      throw error;
    }
  }
}
