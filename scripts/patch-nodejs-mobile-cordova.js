import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const gradlePath = path.join(rootDir, "node_modules", "nodejs-mobile-cordova", "src", "android", "build.gradle");
const javaPaths = [
  path.join(rootDir, "node_modules", "nodejs-mobile-cordova", "src", "android", "java", "com", "janeasystems", "cdvnodejsmobile", "NodeJS.java"),
  path.join(rootDir, "android", "capacitor-cordova-android-plugins", "src", "main", "java", "com", "janeasystems", "cdvnodejsmobile", "NodeJS.java")
];
const generatedCordovaBuildPath = path.join(rootDir, "android", "capacitor-cordova-android-plugins", "build.gradle");

if (!fs.existsSync(gradlePath)) {
  throw new Error("nodejs-mobile-cordova Android Gradle file is missing. Run npm install first.");
}

const source = fs.readFileSync(gradlePath, "utf8");
let patched = source.replace(/\bjcenter\(\)/g, "mavenCentral()");
patched = patched.replace(
  /String projectWWW; \/\/ www assets folder from the Application project\.[\s\S]*?String shouldRebuildNativeModules = System\.getenv\('NODEJS_MOBILE_BUILD_NATIVE_MODULES'\);/,
  `String projectWWW; // www assets folder from the Application project.
    def projectWWWCandidates = [
        "\${project.projectDir}/src/main/assets/www",
        "\${rootProject.projectDir}/capacitor-cordova-android-plugins/src/main/assets/www",
        "\${rootProject.projectDir}/app/src/main/assets/public"
    ];
    projectWWW = projectWWWCandidates.find { candidate -> file(candidate).exists() };
    if (projectWWW == null) {
        throw new GradleException('nodejs-mobile-cordova could not find a Capacitor www folder. Checked: ' + projectWWWCandidates.join(', '));
    }

    String shouldRebuildNativeModules = System.getenv('NODEJS_MOBILE_BUILD_NATIVE_MODULES');`
);
patched = patched.replace(
  /if \(GradleVersion\.current\(\) < GradleVersion\.version\("4\.0"\)\) \{\s*android\.sourceSets\.main\.jniLibs\.srcDirs \+= 'libs\/cdvnodejsmobile\/libnode\/bin\/';\s*\}/,
  "android.sourceSets.main.jniLibs.srcDirs += 'libs/cdvnodejsmobile/libnode/bin/';"
);
patched = patched.replace(
  /import org\.gradle\.util\.GradleVersion;\s*\n\s*cdvPluginPostBuildExtras \+=/,
  `import org.gradle.util.GradleVersion;

if (!binding.hasVariable('cdvPluginPostBuildExtras') || cdvPluginPostBuildExtras == null) {
    ext.cdvPluginPostBuildExtras = []
}

project.ext.cdvPluginPostBuildExtras.add(`
);
patched = patched.replace(/\n};\s*$/s, "\n});\n");
if (patched !== source) {
  fs.writeFileSync(gradlePath, patched);
  console.log("Patched nodejs-mobile-cordova Android Gradle repositories.");
} else {
  console.log("nodejs-mobile-cordova Android Gradle repositories already patched.");
}

for (const javaPath of javaPaths) {
  if (!fs.existsSync(javaPath)) continue;
  const javaSource = fs.readFileSync(javaPath, "utf8");
  const javaPatched = javaSource
    .replace(/\bBuildConfig\.DEBUG\b/g, "false")
    .replace(/capacitor\.cordova\.android\.plugins\.BuildConfig\.DEBUG/g, "false");
  if (javaPatched !== javaSource) {
    fs.writeFileSync(javaPath, javaPatched);
    console.log(`Patched ${path.relative(rootDir, javaPath)} BuildConfig reference.`);
  }
}

if (fs.existsSync(generatedCordovaBuildPath)) {
  const buildSource = fs.readFileSync(generatedCordovaBuildPath, "utf8");
  const buildPatched = buildSource.includes("ndkVersion project.hasProperty('ndkVersion')")
    ? buildSource
    : buildSource.replace(
        /namespace = "capacitor\.cordova\.android\.plugins"\n/,
        `namespace = "capacitor.cordova.android.plugins"
    ndkVersion project.hasProperty('ndkVersion') ? rootProject.ext.ndkVersion : '28.2.13676358'
`
      );
  if (buildPatched !== buildSource) {
    fs.writeFileSync(generatedCordovaBuildPath, buildPatched);
    console.log("Patched generated Cordova plugin ndkVersion.");
  }
}
