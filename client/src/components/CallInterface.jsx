import CallControls from "./CallControls.jsx";
import VideoGrid from "./VideoGrid.jsx";

function CallInterface({
  provider,
  roomName,
  participants,
  microphoneEnabled,
  cameraEnabled,
  onToggleMicrophone,
  onToggleCamera,
  onLeave,
  mediaControls = true,
  connecting = false,
  error = "",
  children,
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 text-white sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-300">
            {provider} call
          </p>
          <h1 className="mt-1 text-xl font-semibold">{roomName}</h1>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
          {connecting ? "Connecting..." : error ? "Connection issue" : "In call"}
        </span>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <section className="flex-1">
        {children || (
          <VideoGrid participants={participants} provider={provider} />
        )}
      </section>

      <footer className="mt-6 rounded-2xl border border-white/10 bg-[#171a23] p-4">
        <CallControls
          microphoneEnabled={microphoneEnabled}
          cameraEnabled={cameraEnabled}
          onToggleMicrophone={onToggleMicrophone}
          onToggleCamera={onToggleCamera}
          onLeave={onLeave}
          mediaControls={mediaControls}
          connecting={connecting}
        />
      </footer>
    </main>
  );
}

export default CallInterface;
