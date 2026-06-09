export function coverDataUri(label, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
      <rect width="900" height="900" fill="#070707"/>
      <rect x="70" y="70" width="760" height="760" fill="${color}" opacity="0.16" stroke="${color}" stroke-width="8" stroke-dasharray="26 22"/>
      <circle cx="450" cy="450" r="220" fill="none" stroke="#f0ede7" stroke-width="10" opacity="0.72"/>
      <circle cx="450" cy="450" r="46" fill="${color}"/>
      <path d="M245 640 C 355 585, 475 705, 655 610" fill="none" stroke="#f0ede7" stroke-width="13" stroke-linecap="round" opacity="0.78"/>
      <text x="450" y="165" text-anchor="middle" fill="#f0ede7" font-size="44" font-family="Segoe UI, sans-serif" letter-spacing="3">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function createDefaultMockTracks() {
  return [
    {
      id: "lofi-morning",
      title: "Morning Desk Light",
      artist: "Claude FM Studio",
      mood: "清醒",
      duration: 171,
      src: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
      cover: coverDataUri("MORNING DESK", "#e66f58"),
      reason: "适合开机后整理今天的节奏，鼓点轻，不抢注意力。"
    },
    {
      id: "city-focus",
      title: "Soft Focus Loop",
      artist: "NCM Adapter Mock",
      mood: "专注",
      duration: 145,
      src: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3",
      cover: coverDataUri("SOFT FOCUS", "#75a9d8"),
      reason: "用低频和简单和弦托住工作流，适合连续写代码。"
    },
    {
      id: "chisway-kolo",
      title: "KOLO",
      artist: "Chisway",
      mood: "律动",
      duration: 0,
      src: "/media/chisway-kolo.mp3",
      cover: "/media/chisway-kolo.jpg",
      reason: "根目录导入的本地曲目，节奏更直接，适合替换掉原来的占位播放源。"
    },
    {
      id: "chisway-overflow",
      title: "Overflow",
      artist: "Chisway",
      mood: "流动",
      duration: 0,
      src: "/media/chisway-overflow.mp3",
      cover: "/media/chisway-overflow.jpg",
      reason: "根目录导入的本地曲目，适合让 Claudio 从封面和歌名展开新的歌曲理解。"
    },
    {
      id: "omah-lay-understand",
      title: "understand",
      artist: "Omah Lay",
      mood: "人声",
      duration: 0,
      src: "/media/omah-lay-understand.mp3",
      cover: "/media/omah-lay-understand.jpg",
      reason: "根目录导入的本地曲目，人声更突出，适合后续做更有情绪的 DJ 解读。"
    }
  ];
}

export function createTrackCatalogService({
  config,
  state,
  tracks = createDefaultMockTracks(),
  getLocalTrackById = () => null
}) {
  function getSafeIndex(index = state.currentIndex) {
    if (!tracks.length) return 0;
    const numeric = Number(index);
    const whole = Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
    return ((whole % tracks.length) + tracks.length) % tracks.length;
  }

  function getCurrentTrack() {
    return tracks[getSafeIndex()];
  }

  function getTrackById(trackId) {
    return tracks.find((track) => track.id === trackId)
      || getLocalTrackById(trackId)
      || getCurrentTrack();
  }

  function getIntegrations() {
    return {
      claude: Boolean(config.anthropicKey),
      fishAudio: Boolean(config.fishAudioKey && config.fishAudioReferenceId),
      mimoTts: Boolean(config.mimoTtsKey),
      openai: Boolean(config.openaiKey && config.openaiKey !== config.openaiBaseUrl),
      weather: Boolean(config.qweatherApiKey),
      qweather: Boolean(config.qweatherApiKey),
      netease: Boolean(config.neteaseCookie),
      upnp: false
    };
  }

  return {
    tracks,
    getTrackCount: () => tracks.length,
    getCurrentTrack,
    getTrackById,
    getIntegrations
  };
}
