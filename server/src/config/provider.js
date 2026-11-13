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
};

export const VIDEO_PROVIDER =
  process.env.VIDEO_PROVIDER?.trim().toLowerCase() || "agora";

if (!Object.hasOwn(providerLoaders, VIDEO_PROVIDER)) {
  throw new Error(
    `Unsupported VIDEO_PROVIDER "${VIDEO_PROVIDER}". Supported providers: ${Object.keys(providerLoaders).join(", ")}`
  );
}

export function getVideoProviderService() {
  return providerLoaders[VIDEO_PROVIDER]();
}
