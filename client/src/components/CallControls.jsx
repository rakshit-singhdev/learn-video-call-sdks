import {
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";

// getDisplayMedia is not available on most mobile browsers
const screenShareSupported =
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getDisplayMedia);

function ControlButton({ active = true, danger = false, highlight = false, ...props }) {
  const color = highlight
    ? "bg-indigo-500 hover:bg-indigo-400"
    : danger || !active
      ? "bg-red-600 hover:bg-red-500"
      : "bg-white/10 hover:bg-white/20";
  return (
    <button
      type="button"
      className={`rounded-full p-4 text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${color}`}
      {...props}
    />
  );
}

function CallControls({
  microphoneEnabled,
  cameraEnabled,
  screenSharing = false,
  onToggleMicrophone,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  mediaControls = true,
  connecting = false,
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {mediaControls && (
        <>
          <ControlButton
            active={microphoneEnabled}
            onClick={() => onToggleMicrophone?.()}
            disabled={connecting}
            aria-label={microphoneEnabled ? "Mute microphone" : "Unmute microphone"}
            title={microphoneEnabled ? "Mute" : "Unmute (or hold Space to talk)"}
          >
            {microphoneEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </ControlButton>
          <ControlButton
            active={cameraEnabled}
            onClick={() => onToggleCamera?.()}
            disabled={connecting}
            aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
          >
            {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </ControlButton>
          {screenShareSupported && onToggleScreenShare && (
            <ControlButton
              highlight={screenSharing}
              onClick={() => onToggleScreenShare()}
              disabled={connecting}
              aria-label={screenSharing ? "Stop presenting" : "Present your screen"}
              title={screenSharing ? "Stop presenting" : "Present your screen"}
            >
              {screenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
            </ControlButton>
          )}
        </>
      )}
      <ControlButton danger onClick={onLeave} aria-label="Leave call">
        <PhoneOff size={20} />
      </ControlButton>
    </div>
  );
}

export default CallControls;
