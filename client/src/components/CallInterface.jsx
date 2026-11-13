import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import CallControls from "./CallControls.jsx";
import VideoGrid from "./VideoGrid.jsx";

function isTypingTarget(target) {
  return Boolean(
    target?.closest?.("input, textarea, select, [contenteditable='true']")
  );
}

// Meet-style push-to-talk: while muted, holding Space unmutes until released.
function usePushToTalk({ enabled, microphoneEnabled, onToggleMicrophone }) {
  const [talking, setTalking] = useState(false);
  const latestRef = useRef({ microphoneEnabled, onToggleMicrophone });

  useEffect(() => {
    latestRef.current = { microphoneEnabled, onToggleMicrophone };
  }, [microphoneEnabled, onToggleMicrophone]);

  useEffect(() => {
    if (!enabled) return undefined;

    let held = false;
    // Serialise mic changes so a quick tap can't leave the mic open
    let queue = Promise.resolve();
    const setMicrophone = (state) => {
      queue = queue
        .then(() => latestRef.current.onToggleMicrophone?.(state))
        .catch(() => {});
    };

    const release = () => {
      if (!held) return;
      held = false;
      setTalking(false);
      setMicrophone(false);
    };

    const handleKeyDown = (event) => {
      if (event.code !== "Space" || isTypingTarget(event.target)) return;
      if (held) {
        event.preventDefault();
        return;
      }
      if (event.repeat || latestRef.current.microphoneEnabled) return;
      event.preventDefault();
      held = true;
      setTalking(true);
      setMicrophone(true);
    };

    const handleKeyUp = (event) => {
      if (event.code !== "Space" || !held) return;
      event.preventDefault();
      release();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", release);
      release();
    };
  }, [enabled]);

  return talking;
}

function CallInterface({
  provider,
  roomName,
  participants,
  microphoneEnabled,
  cameraEnabled,
  screenSharing = false,
  onToggleMicrophone,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  mediaControls = true,
  connecting = false,
  error = "",
  children,
}) {
  const pushToTalk = usePushToTalk({
    enabled: mediaControls && !connecting && Boolean(onToggleMicrophone),
    microphoneEnabled,
    onToggleMicrophone,
  });

  return (
    <div className="bg-black">
      <main className="mx-auto flex h-dvh w-full flex-col px-3 py-3 text-white sm:px-5 sm:py-4">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold capitalize text-indigo-300">
              {provider} call
            </p>
            <h1 className="mt-0.5 truncate text-lg font-semibold sm:text-xl">{roomName}</h1>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
            {connecting ? "Connecting..." : error ? "Connection issue" : "In call"}
          </span>
        </header>

        {error && (
          <p
            role="alert"
            className="mb-3 shrink-0 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {/* Fixed-height area; VideoGrid measures it to size the tiles */}
        <section className="relative min-h-0 flex-1">
          {children || (
            <VideoGrid participants={participants} provider={provider} />
          )}
          {pushToTalk && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium shadow-lg">
              <Mic size={15} />
              You&apos;re unmuted. Release Space to mute
            </div>
          )}
        </section>

        <footer className="mt-3 shrink-0">
          <CallControls
            microphoneEnabled={microphoneEnabled}
            cameraEnabled={cameraEnabled}
            screenSharing={screenSharing}
            onToggleMicrophone={onToggleMicrophone}
            onToggleCamera={onToggleCamera}
            onToggleScreenShare={onToggleScreenShare}
            onLeave={onLeave}
            mediaControls={mediaControls}
            connecting={connecting}
          />
          {mediaControls && !connecting && !microphoneEnabled && !pushToTalk && (
            <p className="mt-2 hidden text-center text-xs text-gray-500 sm:block">
              You&apos;re muted. Hold <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-sans text-gray-300">Space</kbd> to talk
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}

export default CallInterface;
