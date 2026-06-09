import assert from "node:assert/strict";
import {
  createTrackCatalogService,
  coverDataUri,
  createDefaultMockTracks
} from "../src/server/track-catalog-service.js";

{
  const uri = coverDataUri("HELLO", "#123456");
  assert.match(uri, /^data:image\/svg\+xml,/);
  assert.match(decodeURIComponent(uri.slice("data:image/svg+xml,".length)), /HELLO/);
  assert.match(decodeURIComponent(uri.slice("data:image/svg+xml,".length)), /#123456/);
}

{
  const tracks = createDefaultMockTracks();
  assert.equal(tracks.length, 5);
  assert.equal(tracks[0].id, "lofi-morning");
  assert.equal(tracks[0].title, "Morning Desk Light");
  assert.match(tracks[0].cover, /^data:image\/svg\+xml,/);
  assert.equal(tracks.at(-1).id, "omah-lay-understand");
}

{
  const state = { currentIndex: 1 };
  const service = createTrackCatalogService({
    config: {
      anthropicKey: "ak",
      fishAudioKey: "fk",
      fishAudioReferenceId: "ref",
      mimoTtsKey: "mk",
      openaiKey: "ok",
      openaiBaseUrl: "https://api.example",
      qweatherApiKey: "wk",
      neteaseCookie: "MUSIC_U=1"
    },
    state,
    getLocalTrackById: (id) => id === "local-1" ? { id: "local-1", title: "Local Track" } : null
  });
  assert.equal(service.getTrackCount(), 5);
  assert.equal(service.getCurrentTrack().id, "city-focus");
  assert.equal(service.getTrackById("lofi-morning").title, "Morning Desk Light");
  assert.equal(service.getTrackById("local-1").title, "Local Track");
  assert.equal(service.getTrackById("missing").id, "city-focus");
  assert.deepEqual(service.getIntegrations(), {
    claude: true,
    fishAudio: true,
    mimoTts: true,
    openai: true,
    weather: true,
    qweather: true,
    netease: true,
    upnp: false
  });
}

{
  const service = createTrackCatalogService({
    config: {
      anthropicKey: "",
      fishAudioKey: "",
      fishAudioReferenceId: "",
      mimoTtsKey: "",
      openaiKey: "https://api.example",
      openaiBaseUrl: "https://api.example",
      qweatherApiKey: "",
      neteaseCookie: ""
    },
    state: { currentIndex: 99 }
  });
  assert.equal(service.getCurrentTrack().id, "omah-lay-understand");
  assert.equal(service.getIntegrations().openai, false);
}

console.log("track-catalog-service tests passed");
