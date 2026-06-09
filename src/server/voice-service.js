import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

function hashText(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function rawPcmToWav(pcm, sampleRate = 22050, channels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function sanitizeVoiceText(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0\u2000-\u200D\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createVoiceService({
  config,
  rootDir,
  voiceCacheDir,
  mimoAdapter,
  fetchImpl = fetch,
  existsImpl = existsSync,
  mkdirImpl = mkdir,
  writeFileImpl = writeFile,
  runProcess
}) {
  function normalizeVoiceSettings(settings = {}) {
    const preset = String(settings.preset || config.mimoTtsVoice || "冰糖").trim() || "冰糖";
    const customPrompt = String(settings.customPrompt || "").trim();
    if (customPrompt) {
      return {
        mode: "custom",
        model: config.mimoVoiceDesignModel,
        voice: customPrompt,
        prompt: customPrompt
      };
    }
    return {
      mode: "preset",
      model: config.mimoTtsModel,
      voice: preset,
      prompt: ""
    };
  }

  function getVoiceCacheKey(text, settings = {}) {
    const voiceSettings = normalizeVoiceSettings(settings);
    return hashText([
      config.mimoTtsBaseUrl,
      voiceSettings.model,
      voiceSettings.voice,
      config.mimoTtsFormat,
      config.mimoTtsStyle,
      config.piperVoice,
      config.fishAudioReferenceId,
      config.fishAudioModel,
      text
    ].join("|"));
  }

  function getVoiceCachePaths(key, mimeType = "audio/wav") {
    const extension = mimeType.includes("mpeg") || mimeType.includes("mp3") ? ".mp3" : ".wav";
    return {
      fileName: `${key}${extension}`,
      filePath: path.join(voiceCacheDir, `${key}${extension}`)
    };
  }

  function getVoiceCachePathsForText(text, mimeType = "audio/wav", settings = {}) {
    return getVoiceCachePaths(getVoiceCacheKey(text, settings), mimeType);
  }

  async function readCachedVoice(text, settings = {}) {
    const key = getVoiceCacheKey(text, settings);
    const wav = getVoiceCachePaths(key, "audio/wav");
    const mp3 = getVoiceCachePaths(key, "audio/mpeg");
    if (existsImpl(wav.filePath)) {
      return {
        provider: "cache",
        text,
        audioUrl: `/api/cache/voice/${wav.fileName}`,
        mimeType: "audio/wav",
        reason: null,
        cached: true
      };
    }
    if (existsImpl(mp3.filePath)) {
      return {
        provider: "cache",
        text,
        audioUrl: `/api/cache/voice/${mp3.fileName}`,
        mimeType: "audio/mpeg",
        reason: null,
        cached: true
      };
    }
    return null;
  }

  async function writeCachedVoice(text, result, settings = {}) {
    if (!result?.audioUrl?.startsWith("data:")) return result;
    const match = result.audioUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return result;
    await mkdirImpl(voiceCacheDir, { recursive: true });
    const mimeType = result.mimeType || match[1] || "audio/wav";
    const key = getVoiceCacheKey(text, settings);
    const { fileName, filePath } = getVoiceCachePaths(key, mimeType);
    await writeFileImpl(filePath, Buffer.from(match[2], "base64"));
    return {
      ...result,
      audioUrl: `/api/cache/voice/${fileName}`,
      mimeType,
      cached: false
    };
  }

  async function writeCachedVoiceFromBase64(text, audioData, mimeType = "audio/wav", provider = "mimo", settings = {}) {
    await mkdirImpl(voiceCacheDir, { recursive: true });
    const { fileName, filePath } = getVoiceCachePathsForText(text, mimeType, settings);
    await writeFileImpl(filePath, Buffer.from(audioData, "base64"));
    return {
      provider,
      text,
      audioUrl: `/api/cache/voice/${fileName}`,
      mimeType,
      cached: false,
      reason: null
    };
  }

  async function synthesizeWithPiper(text) {
    if (!config.piperEnabled) {
      return null;
    }

    const voicePath = path.isAbsolute(config.piperVoice)
      ? config.piperVoice
      : path.join(rootDir, config.piperVoice);
    if (!existsImpl(voicePath)) {
      return null;
    }

    if (typeof runProcess !== "function") {
      throw new Error("Piper process runner is not configured");
    }
    const output = await runProcess(config.piperCommand, ["--model", voicePath, "--output-raw"], text);
    return {
      provider: "piper",
      text,
      audioUrl: `data:audio/wav;base64,${rawPcmToWav(output).toString("base64")}`,
      mimeType: "audio/wav",
      reason: null
    };
  }

  async function synthesizeWithMimo(text, settings = {}) {
    if (!config.mimoTtsKey) return null;
    const voiceSettings = normalizeVoiceSettings(settings);
    const audio = {
      format: config.mimoTtsFormat
    };
    if (voiceSettings.mode !== "custom") {
      audio.voice = voiceSettings.voice;
    }
    const payload = {
      model: voiceSettings.model,
      audio,
      messages: [
        {
          role: "user",
          content: voiceSettings.mode === "custom" ? voiceSettings.prompt : config.mimoTtsStyle
        },
        {
          role: "assistant",
          content: text
        }
      ]
    };
    const data = await mimoAdapter.chatCompletion(payload, { errorPrefix: "MiMo TTS" });

    const audioData = data.choices?.[0]?.message?.audio?.data;
    if (!audioData) {
      throw new Error("MiMo TTS response did not include audio data");
    }
    const mimeType = config.mimoTtsFormat === "mp3" ? "audio/mpeg" : `audio/${config.mimoTtsFormat}`;
    return {
      provider: "mimo",
      text,
      audioUrl: `data:${mimeType};base64,${audioData}`,
      mimeType,
      reason: null
    };
  }

  async function synthesizeWithFishAudio(text, settings = {}) {
    if (!config.fishAudioKey || !config.fishAudioReferenceId) {
      return {
        provider: "browser",
        text,
        audioUrl: null,
        mimeType: null,
        reason: config.fishAudioKey ? "missing-reference-id" : "missing-api-key"
      };
    }

    const response = await fetchImpl("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.fishAudioKey}`,
        model: config.fishAudioModel
      },
      body: JSON.stringify({
        text,
        reference_id: config.fishAudioReferenceId,
        temperature: 0.7,
        top_p: 0.7,
        prosody: {
          speed: 1,
          volume: 0,
          normalize_loudness: true
        },
        chunk_length: 300,
        normalize: true,
        format: "mp3",
        sample_rate: 44100,
        mp3_bitrate: 128,
        latency: "normal"
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Fish Audio failed: ${response.status} ${detail}`.trim());
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    return writeCachedVoice(text, {
      provider: "fish",
      text,
      audioUrl: `data:audio/mpeg;base64,${bytes.toString("base64")}`,
      mimeType: "audio/mpeg",
      reason: null
    }, settings);
  }

  async function synthesizeVoice(text, settings = {}) {
    const cleanText = sanitizeVoiceText(text).slice(0, 900);
    if (!cleanText) {
      return {
        provider: "none",
        text: "",
        audioUrl: null,
        mimeType: null,
        reason: "empty-text"
      };
    }

    const cached = await readCachedVoice(cleanText, settings);
    if (cached) return cached;

    const mimoResult = await synthesizeWithMimo(cleanText, settings);
    if (mimoResult) return writeCachedVoice(cleanText, mimoResult, settings);

    const piperResult = await synthesizeWithPiper(cleanText);
    if (piperResult) return writeCachedVoice(cleanText, piperResult, settings);

    return synthesizeWithFishAudio(cleanText, settings);
  }

  return {
    normalizeVoiceSettings,
    getVoiceCacheKey,
    getVoiceCachePaths,
    getVoiceCachePathsForText,
    readCachedVoice,
    writeCachedVoice,
    writeCachedVoiceFromBase64,
    sanitizeVoiceText,
    synthesizeVoice,
    synthesizeWithPiper,
    synthesizeWithMimo,
    synthesizeWithFishAudio,
    rawPcmToWav
  };
}
