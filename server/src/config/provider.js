const providerLoaders = {
  agora: async () => {
    const service = await import("../services/agora.js");
    return {
      create: service.createAgoraRoom,
      join: service.joinAgoraRoom,
      delete: service.deleteAgoraRoom,
    };
  },
  daily: async () => {
    const service = await import("../services/daily.js");
    return {
      create: service.createDailyRoom,
      join: service.joinDailyRoom,
      delete: service.deleteDailyRoom,
    };
  },
  livekit: async () => {
    const service = await import("../services/livekit.js");
    return {
      create: service.createLiveKitRoom,
      join: service.joinLiveKitRoom,
      delete: service.deleteLiveKitRoom,
    };
  },
  jitsi: async () => {
    const service = await import("../services/jitsi.js");
    return {
      create: service.createJitsiRoom,
      join: service.joinJitsiRoom,
      delete: service.deleteJitsiRoom,
    };
  },
};

const configuredProviders = process.env.VIDEO_PROVIDERS?.trim();
const configuredDefault = process.env.VIDEO_PROVIDER?.trim().toLowerCase();

export const VIDEO_PROVIDERS = configuredProviders
  ? [...new Set(configuredProviders.split(",").map((provider) => provider.trim().toLowerCase()))]
  : [configuredDefault || "agora"];

if (VIDEO_PROVIDERS.some((provider) => !provider)) {
  throw new Error("VIDEO_PROVIDERS must be a comma-separated list of provider names");
}

const unsupportedProviders = VIDEO_PROVIDERS.filter(
  (provider) => !Object.hasOwn(providerLoaders, provider)
);

if (unsupportedProviders.length > 0) {
  throw new Error(
    `Unsupported VIDEO_PROVIDERS: ${unsupportedProviders.join(", ")}. Supported providers: ${Object.keys(providerLoaders).join(", ")}`
  );
}

export const DEFAULT_VIDEO_PROVIDER = configuredDefault || VIDEO_PROVIDERS[0];

if (!VIDEO_PROVIDERS.includes(DEFAULT_VIDEO_PROVIDER)) {
  throw new Error(
    `VIDEO_PROVIDER "${DEFAULT_VIDEO_PROVIDER}" must be included in VIDEO_PROVIDERS`
  );
}

export const VIDEO_PROVIDER = DEFAULT_VIDEO_PROVIDER;

export function getVideoProviderService(provider = DEFAULT_VIDEO_PROVIDER) {
  if (!VIDEO_PROVIDERS.includes(provider)) {
    throw new Error(`Video provider "${provider}" is not enabled`);
  }

  return providerLoaders[provider]();
}
