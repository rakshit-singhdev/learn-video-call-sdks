import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

function CallControls({
  microphoneEnabled,
  cameraEnabled,
  onToggleMicrophone,
  onToggleCamera,
  onLeave,
  mediaControls = true,
  connecting = false,
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {mediaControls && (
        <>
          <button
            type="button"
            onClick={onToggleMicrophone}
            disabled={connecting}
            aria-label={
              microphoneEnabled ? "Mute microphone" : "Unmute microphone"
            }
            className="rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {microphoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            type="button"
            onClick={onToggleCamera}
            disabled={connecting}
            aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
            className="rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onLeave}
        aria-label="Leave call"
        className="rounded-full bg-red-600 p-4 text-white transition hover:bg-red-500"
      >
        <PhoneOff size={20} />
      </button>
    </div>
  );
}

export default CallControls;