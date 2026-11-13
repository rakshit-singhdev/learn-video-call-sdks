import { useEffect, useRef, useState } from "react";
import { MicOff, MonitorUp, VideoOff } from "lucide-react";
import AudioLevelMeter from "./AudioLevelMeter.jsx";

const GAP = 12;
const MIN_TILE_WIDTH = 160;

// Pick the column count + tile aspect that gives the largest tiles that
// still fit inside the available area (same idea as Meet/Zoom gallery view).
function computeLayout(count, width, height) {
  if (!count || !width || !height) return null;

  const aspects = width >= height ? [16 / 9, 4 / 3] : [16 / 9, 4 / 3, 1, 3 / 4];
  let best = null;

  for (let cols = 1; cols <= count; cols += 1) {
    const rows = Math.ceil(count / cols);
    const maxWidth = (width - GAP * (cols - 1)) / cols;
    const maxHeight = (height - GAP * (rows - 1)) / rows;

    for (const aspect of aspects) {
      const tileWidth = Math.min(maxWidth, maxHeight * aspect);
      const tileHeight = tileWidth / aspect;
      const area = tileWidth * tileHeight;
      if (!best || area > best.area) {
        best = { width: tileWidth, height: tileHeight, area, aspect };
      }
    }
  }

  // Too many people to fit: keep a usable minimum size and let the grid scroll
  if (best.width < MIN_TILE_WIDTH) {
    best.width = MIN_TILE_WIDTH;
    best.height = MIN_TILE_WIDTH / best.aspect;
  }

  return { width: Math.floor(best.width), height: Math.floor(best.height) };
}

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function VideoTile({ participant, provider, width, height }) {
  const videoContainerRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const videoTrack = participant.cameraEnabled ? participant.videoTrack : null;
  // Screens are shown whole (letterboxed); cameras fill the tile
  const fit = participant.isScreen ? "contain" : "cover";

  useEffect(() => {
    if (!videoTrack) return undefined;
    const videoContainer = videoContainerRef.current;
    const videoElement = videoRef.current;

    if (provider === "agora") {
      videoTrack.play(videoContainer, { fit });
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
  }, [provider, videoTrack, fit]);

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

  const highlighted = speaking && participant.audioEnabled;

  return (
    <article
      style={{ width, height }}
      className={`relative shrink-0 overflow-hidden rounded-xl border transition-shadow duration-150 ${
        participant.isScreen ? "bg-black" : "bg-[#1c1f27]"
      } ${
        highlighted
          ? "border-indigo-400 shadow-[0_0_0_2px_rgba(129,140,248,0.9)]"
          : "border-white/10"
      }`}
    >
      {provider === "agora" ? (
        <div ref={videoContainerRef} className="absolute inset-0" />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className={`absolute inset-0 h-full w-full ${
            participant.isScreen ? "object-contain" : "object-cover"
          } ${
            videoTrack ? "" : "hidden"
          }`}
        />
      )}
      <audio ref={audioRef} autoPlay muted={participant.isLocal} />
      {!videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-2xl font-semibold text-indigo-200 transition-shadow ${
              highlighted ? "shadow-[0_0_0_4px_rgba(129,140,248,0.6)]" : ""
            }`}
          >
            {participant.name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute right-3 top-3">
        {participant.isScreen ? null : participant.audioEnabled ? (
          <AudioLevelMeter
            track={participant.audioTrack}
            enabled={participant.audioEnabled}
            onSpeakingChange={setSpeaking}
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-red-400">
            <MicOff size={13} aria-label="Muted" />
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-white">
          {participant.isScreen && <MonitorUp size={15} className="shrink-0" />}
          <span className="truncate">
            {participant.isScreen
              ? participant.isLocal
                ? "You are presenting"
                : `${participant.name} is presenting`
              : `${participant.name}${participant.isLocal ? " (You)" : ""}`}
          </span>
        </span>
        {!participant.isScreen && !participant.cameraEnabled && (
          <VideoOff size={15} className="text-gray-300" aria-label="Camera off" />
        )}
      </div>
    </article>
  );
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// While someone presents: the screen takes the main area and everyone else
// moves to a strip (right side on landscape, bottom on portrait).
function SpotlightLayout({ spotlight, others, provider, width, height }) {
  const landscape = width >= height;
  const stripSize = others.length
    ? landscape
      ? clamp(width * 0.2, 150, 280)
      : clamp(height * 0.22, 90, 150)
    : 0;
  const stripSpace = stripSize ? stripSize + GAP : 0;
  const mainWidth = Math.floor(landscape ? width - stripSpace : width);
  const mainHeight = Math.floor(landscape ? height : height - stripSpace);
  const tileWidth = Math.floor(landscape ? stripSize : (stripSize * 16) / 9);
  const tileHeight = Math.floor(landscape ? (stripSize * 9) / 16 : stripSize);

  return (
    <div className={`flex h-full ${landscape ? "flex-row" : "flex-col"}`} style={{ gap: GAP }}>
      <VideoTile
        participant={spotlight}
        provider={provider}
        width={mainWidth}
        height={mainHeight}
      />
      {others.length > 0 && (
        <div
          className={`flex shrink-0 ${
            landscape ? "flex-col overflow-y-auto" : "flex-row overflow-x-auto"
          }`}
          style={{ gap: GAP, [landscape ? "width" : "height"]: stripSize }}
        >
          {others.map((participant) => (
            <VideoTile
              key={participant.id}
              participant={participant}
              provider={provider}
              width={tileWidth}
              height={tileHeight}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VideoGrid({ participants, provider }) {
  const containerRef = useRef(null);
  const { width, height } = useElementSize(containerRef);
  // Prefer someone else's presentation over your own
  const spotlight =
    participants.find((participant) => participant.isScreen && !participant.isLocal) ||
    participants.find((participant) => participant.isScreen);
  const layout = spotlight ? null : computeLayout(participants.length, width, height);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${spotlight ? "overflow-hidden" : "overflow-y-auto"}`}
    >
      {spotlight && width > 0 ? (
        <SpotlightLayout
          key={spotlight.id}
          spotlight={spotlight}
          others={participants.filter((participant) => participant !== spotlight)}
          provider={provider}
          width={width}
          height={height}
        />
      ) : !participants.length ? (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          Waiting for participants to join...
        </div>
      ) : (
        layout && (
          <div
            className="flex min-h-full flex-wrap content-center items-center justify-center"
            style={{ gap: GAP }}
          >
            {participants.map((participant) => (
              <VideoTile
                key={participant.id}
                participant={participant}
                provider={provider}
                width={layout.width}
                height={layout.height}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default VideoGrid;
