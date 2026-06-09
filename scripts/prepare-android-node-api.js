import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const rootDir = path.resolve(import.meta.dirname, "..");
const sourceDir = path.join(rootDir, "android-node");
const targetDirs = [
  path.join(rootDir, "public", "nodejs-project"),
  path.join(rootDir, "android", "app", "src", "main", "assets", "nodejs-project"),
  path.join(rootDir, "android", "capacitor-cordova-android-plugins", "src", "main", "assets", "www", "nodejs-project")
];
const nativeLibSourceDir = path.join(
  rootDir,
  "android",
  "capacitor-cordova-android-plugins",
  "src",
  "main",
  "libs",
  "cdvnodejsmobile"
);
const nativeLibTargetDirs = [
  path.join(rootDir, "android", "app", "libs", "cdvnodejsmobile"),
  path.join(rootDir, "android", "capacitor-cordova-android-plugins", "libs", "cdvnodejsmobile")
];
const nodeMobileLibDir = path.join(rootDir, "node_modules", "nodejs-mobile-cordova", "libs", "android", "libnode");
const nodeMobileAssetsDirName = "nodejs-mobile-cordova-assets";
const nodeMobileAssetSourceDir = path.join(rootDir, "node_modules", "nodejs-mobile-cordova", "install", nodeMobileAssetsDirName);
const nodeMobileBuiltinModulesDir = path.join(nodeMobileAssetSourceDir, "builtin_modules");
const nodeMobileAssetTargetDirs = [
  path.join(rootDir, "android", "app", "src", "main", "assets", nodeMobileAssetsDirName),
  path.join(rootDir, "android", "capacitor-cordova-android-plugins", "src", "main", "assets", nodeMobileAssetsDirName)
];
const packageDir = path.join(sourceDir, "node_modules", "NeteaseCloudMusicApi");
const rootEnvPath = path.join(rootDir, ".env");

if (!fs.existsSync(packageDir)) {
  throw new Error("Missing android-node/node_modules/NeteaseCloudMusicApi. Run npm run android:install-node-api first.");
}
if (!fs.existsSync(nodeMobileBuiltinModulesDir)) {
  throw new Error("Missing nodejs-mobile-cordova builtin_modules assets. Run npm install first.");
}

for (const targetDir of targetDirs) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of ["main.js", "api-service.js", "package.json", "package-lock.json", "node_modules"]) {
    const source = path.join(sourceDir, entry);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(targetDir, entry), {
      recursive: true,
      dereference: false,
      filter: (from) => {
        const parts = path.relative(sourceDir, from).split(path.sep);
        if (parts.includes(".bin")) return false;
        return !fs.lstatSync(from).isSymbolicLink();
      }
    });
  }
  if (fs.existsSync(rootEnvPath)) {
    fs.copyFileSync(rootEnvPath, path.join(targetDir, "claudio-runtime.env"));
  }

  console.log(`Prepared Android Netease API assets at ${path.relative(rootDir, targetDir)}`);
}

if (fs.existsSync(nodeMobileAssetSourceDir)) {
  for (const targetDir of nodeMobileAssetTargetDirs) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    fs.cpSync(nodeMobileAssetSourceDir, targetDir, { recursive: true });
    console.log(`Prepared Android Node builtin assets at ${path.relative(rootDir, targetDir)}`);
  }
}

if (fs.existsSync(nativeLibSourceDir)) {
  for (const nativeLibTargetDir of nativeLibTargetDirs) {
    fs.rmSync(nativeLibTargetDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(nativeLibTargetDir), { recursive: true });
    fs.cpSync(nativeLibSourceDir, nativeLibTargetDir, { recursive: true });
    if (fs.existsSync(nodeMobileLibDir)) {
      fs.cpSync(nodeMobileLibDir, path.join(nativeLibTargetDir, "libnode"), { recursive: true });
    }
    decompressGzipLibraries(nativeLibTargetDir);
    console.log(`Prepared Android Node native libs at ${path.relative(rootDir, nativeLibTargetDir)}`);
  }
}

function decompressGzipLibraries(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      decompressGzipLibraries(absolutePath);
      continue;
    }
    if (!entry.name.endsWith(".so.gz")) continue;
    const outputPath = absolutePath.replace(/\.gz$/, "");
    fs.writeFileSync(outputPath, zlib.gunzipSync(fs.readFileSync(absolutePath)));
    fs.rmSync(absolutePath, { force: true });
  }
}
