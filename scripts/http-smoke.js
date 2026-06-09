const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3088";
const paths = [
  "/",
  "/app.js",
  "/modules/claudio/voiceController.js",
  "/modules/settings/styledSelect.js",
  "/api/health",
  "/api/capabilities",
  "/api/now?insight=0"
];

for (const path of paths) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  const text = await response.text();
  console.log(`${path} ${response.status} ${text.length}`);
}
