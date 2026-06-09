import { spawn } from "node:child_process";

export function createMimoProcessService({
  config,
  rootDir,
  spawnImpl = spawn
}) {
  function runProcess(command, args, input, timeoutMs = 45000) {
    return new Promise((resolve, reject) => {
      const child = spawnImpl(command, args, {
        cwd: rootDir,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });
      const stdout = [];
      const stderr = [];
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      };
      const timer = setTimeout(() => {
        child.kill();
        finish(reject, new Error(`${command} timed out`));
      }, timeoutMs);

      child.stdout.on("data", (chunk) => stdout.push(chunk));
      child.stderr.on("data", (chunk) => stderr.push(chunk));
      child.on("error", (error) => {
        finish(reject, error);
      });
      child.on("close", (code) => {
        if (code === 0) {
          finish(resolve, Buffer.concat(stdout));
          return;
        }
        finish(reject, new Error(`${command} exited ${code}: ${Buffer.concat(stderr).toString("utf8")}`));
      });
      child.stdin.end(input);
    });
  }

  async function synthesizeWithMimoPowerShell(payload) {
    const script = `
$ErrorActionPreference = "Stop"
$uri = ${JSON.stringify(`${config.mimoTtsBaseUrl}/chat/completions`)}
$key = ${JSON.stringify(config.mimoTtsKey)}
$body = @'
${JSON.stringify(payload)}
'@
$response = Invoke-RestMethod -Uri $uri -Method POST -ContentType "application/json" -Headers @{ "api-key" = $key } -Body $body
$response | ConvertTo-Json -Depth 20 -Compress
`;
    const output = await runProcess("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], "", 60000);
    return JSON.parse(output.toString("utf8"));
  }

  return {
    runProcess,
    synthesizeWithMimoPowerShell
  };
}
