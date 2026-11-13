import { Radio } from "lucide-react";

const providers = [
  { id: "agora", name: "Agora", description: "Real-time communication" },
  { id: "daily", name: "Daily", description: "Video calling API" },
  { id: "livekit", name: "LiveKit", description: "WebRTC infrastructure" },
  { id: "jitsi", name: "Jitsi", description: "Open-source conferencing" },
];

function ProviderSelector({
  enabledProviders,
  selectedProvider,
  onSelect,
  loading,
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">
          Video provider
        </span>
        <span className="text-xs text-gray-500">
          {loading
            ? "Connecting..."
            : selectedProvider || "Server unavailable"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {providers.map((provider) => {
          const enabled = enabledProviders.includes(provider.id);
          const selected = provider.id === selectedProvider;

          return (
            <button
              key={provider.id}
              type="button"
              aria-pressed={selected}
              disabled={!enabled || loading}
              onClick={() => onSelect(provider.id)}
              className={`flex items-center gap-4 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed ${
                selected
                  ? "border-indigo-500 bg-indigo-500/10"
                  : enabled
                    ? "border-white/10 bg-[#0f1117] hover:border-indigo-500/50"
                    : "border-white/10 bg-[#0f1117] opacity-50"
              }`}
            >
              <div
                className={`rounded-lg p-2.5 ${
                  selected
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-white/5 text-gray-400"
                }`}
              >
                <Radio size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {provider.name}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {!enabled
                    ? "Not enabled on server"
                    : selected
                      ? "Selected for new rooms"
                      : provider.description}
                </p>
              </div>
              {selected && (
                <span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-green-400">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Enabled providers are configured with VIDEO_PROVIDERS in server/.env.
      </p>
    </div>
  );
}

export default ProviderSelector;