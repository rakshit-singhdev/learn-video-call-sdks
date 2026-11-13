import { useEffect, useRef } from "react";
import { MicOff, VideoOff } from "lucide-react";

function VideoTile({ participant, provider }) {
  const videoContainerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const videoTrack = participant.cameraEnabled ? participant.videoTrack : null;

  useEffect(() => {
    if (!videoTrack) return undefined;
    const videoContainer = videoContainerRef.current;
    const videoElement = videoRef.current;

    if (provider === "agora") {
      videoTrack.play(videoContainer, { fit: "cover" });
      return () => videoTrack.stop();
    }

    if (provider === "livekit") {
      videoTrack.attach(videoElement);
      return () => videoTrack.detach(videoElement);
    }

    if (provider === "daily") {
      videoElement.srcObject = new MediaStream([videoTrack]);
      return () => {
        videoElement.srcObject = null;
      };
    }

    return undefined;
  }, [provider, videoTrack]);

  useEffect(() => {
    const audioTrack = participant.audioEnabled ? participant.audioTrack : null;
    if (!audioTrack || provider === "agora") return undefined;
    const audioElement = audioRef.current;

    if (provider === "livekit") {
      audioTrack.attach(audioElement);
      return () => audioTrack.detach(audioElement);
    }

    if (provider === "daily") {
      audioElement.srcObject = new MediaStream([audioTrack]);
      return () => {
        audioElement.srcObject = null;
      };
    }

    return undefined;
  }, [provider, participant.audioEnabled, participant.audioTrack]);

  return (
    <article className="relative min-h-56 overflow-hidden rounded-xl border border-white/10 bg-[#171a23]">
      {provider === "agora" ? (
        <div ref={videoContainerRef} className="absolute inset-0" />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={`absolute inset-0 h-full w-full object-cover ${
            videoTrack ? "" : "hidden"
          }`}
        />
      )}
      <audio ref={audioRef} autoPlay muted={participant.isLocal} />
      {!videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-2xl font-semibold text-indigo-200">
            {participant.name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10">
        <span className="truncate text-sm font-medium text-white">
          {participant.name}
          {participant.isLocal ? " (You)" : ""}
        </span>
        <div className="flex items-center gap-2 text-gray-300">
          {!participant.audioEnabled && <MicOff size={15} aria-label="Muted" />}
          {!participant.cameraEnabled && (
            <VideoOff size={15} aria-label="Camera off" />
          )}
        </div>
      </div>
    </article>
  );
}

function VideoGrid({ participants, provider }) {
  if (!participants.length) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-xl border border-white/10 bg-[#171a23] text-sm text-gray-400">
        Waiting for participants to join...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {participants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          provider={provider}
        />
      ))}
    </div>
  );
}

export default VideoGrid;