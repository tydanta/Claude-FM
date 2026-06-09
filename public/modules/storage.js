export function readStorage(key) {
  try {
    return globalThis.window?.localStorage?.getItem(key) || "";
  } catch {
    return "";
  }
}

export function writeStorage(key, value) {
  try {
    if (value) {
      globalThis.window?.localStorage?.setItem(key, value);
    } else {
      globalThis.window?.localStorage?.removeItem(key);
    }
  } catch {}
}
