import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createMimoProcessService } from "../src/server/mimo-process-service.js";

function createChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = {
    ended: false,
    end(input) {
      this.ended = true;
      this.input = input;
    }
  };
  child.killCalls = 0;
  child.kill = () => {
    child.killCalls += 1;
  };
  return child;
}

{
  const child = createChild();
  let spawnCall = null;
  const service = createMimoProcessService({
    config: { mimoTtsBaseUrl: "https://mimo.example", mimoTtsKey: "key-a" },
    rootDir: "D:/app",
    spawnImpl: (command, args, options) => {
      spawnCall = { command, args, options };
      queueMicrotask(() => {
        child.stdout.emit("data", Buffer.from('{"ok":true}'));
        child.emit("close", 0);
      });
      return child;
    }
  });

  const output = await service.runProcess("cmd", ["/c", "echo"], "input", 123);
  assert.deepEqual(JSON.parse(output.toString("utf8")), { ok: true });
  assert.equal(spawnCall.command, "cmd");
  assert.deepEqual(spawnCall.args, ["/c", "echo"]);
  assert.equal(spawnCall.options.cwd, "D:/app");
  assert.equal(spawnCall.options.windowsHide, true);
  assert.deepEqual(spawnCall.options.stdio, ["pipe", "pipe", "pipe"]);
  assert.equal(child.stdin.ended, true);
  assert.equal(child.stdin.input, "input");
}

{
  const child = createChild();
  const service = createMimoProcessService({
    config: { mimoTtsBaseUrl: "https://mimo.example", mimoTtsKey: "key-a" },
    rootDir: "D:/app",
    spawnImpl: () => {
      queueMicrotask(() => {
        child.stderr.emit("data", Buffer.from("bad"));
        child.emit("close", 2);
      });
      return child;
    }
  });
  await assert.rejects(
    () => service.runProcess("cmd", [], "", 1000),
    /cmd exited 2: bad/
  );
}

{
  const child = createChild();
  const service = createMimoProcessService({
    config: { mimoTtsBaseUrl: "https://mimo.example", mimoTtsKey: "key-a" },
    rootDir: "D:/app",
    spawnImpl: () => child
  });
  await assert.rejects(
    () => service.runProcess("slow", [], "", 1),
    /slow timed out/
  );
  assert.equal(child.killCalls, 1);
}

{
  let spawnCall = null;
  const child = createChild();
  const service = createMimoProcessService({
    config: { mimoTtsBaseUrl: "https://mimo.example", mimoTtsKey: "key-a" },
    rootDir: "D:/app",
    spawnImpl: (command, args) => {
      spawnCall = { command, args };
      queueMicrotask(() => {
        child.stdout.emit("data", Buffer.from('{"reply":"ok"}'));
        child.emit("close", 0);
      });
      return child;
    }
  });
  const payload = { model: "m", messages: [{ role: "user", content: "hi" }] };
  assert.deepEqual(await service.synthesizeWithMimoPowerShell(payload), { reply: "ok" });
  assert.equal(spawnCall.command, "powershell");
  assert.deepEqual(spawnCall.args.slice(0, 4), ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command"]);
  assert.match(spawnCall.args[4], /Invoke-RestMethod/);
  assert.match(spawnCall.args[4], /https:\/\/mimo\.example\/chat\/completions/);
  assert.match(spawnCall.args[4], /"model":"m"/);
}

console.log("mimo-process-service tests passed");
