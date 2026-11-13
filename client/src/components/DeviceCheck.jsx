import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, Volume2 } from "lucide-react";
import { createAudioLevelReader, normalizeLevel } from "../hooks/audioLevel.js";

const METER_SEGMENTS = 14;

function describeMediaError(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Permission denied. Allow camera and microphone access in your browser's site settings, then reload.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No matching device was found. Check that it is connected.";
    case "NotReadableError":
    case "AbortError":
      return "The device is busy. Close other apps or tabs using it and try again.";
    default:
      return error?.message || "Unable to access camera or microphone.";
  }
}

function playTestTone() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.connect(context.destination);
  // Short two-note chime
  [660, 880].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    const start = context.currentTime + index * 0.25;
    oscillator.start(start);
    oscillator.stop(start + 0.22);
  });
  gain.gain.setValueAtTime(0.2, context.currentTime);
  window.setTimeout(() => context.close(), 800);
}

function MicMeter({ track }) {
  const segmentsRef = useRef([]);

  useEffect(() => {
    const paint = (level) => {
      const active = Math.round(level * METER_SEGMENTS);
      segmentsRef.current.forEach((segment, index) => {
        if (segment) segment.dataset.on = index < active ? "true" : "false";
      });
    };

    paint(0);
    if (!track) return undefined;
    const reader = createAudioLevelReader(track);
    if (!reader) return undefined;

    let frame;
    let level = 0;
    const tick = () => {
      const target = normalizeLevel(reader.read());
      level = target > level ? target : level * 0.85 + target * 0.15;
      paint(level);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      reader.dispose();
    };
  }, [track]);

  return (
    <div className="flex h-2.5 flex-1 gap-1" aria-label="Microphone level">
      {Array.from({ length: METER_SEGMENTS }, (_, index) => (
        <span
          key={index}
          ref={(element) => {
            segmentsRef.current[index] = element;
          }}
          data-on="false"
          className={`flex-1 rounded-sm bg-white/10 transition-colors duration-75 ${
            index >= METER_SEGMENTS - 3
              ? "data-[on=true]:bg-amber-400"
              : "data-[on=true]:bg-green-400"
          }`}
        />
      ))}
    </div>
  );
}

function DeviceSelect({ label, devices, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || !devices.length}
        className="w-full rounded-lg border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-50"
      >
        {!devices.length && <option value="">No device found</option>}
        {devices.map((device, index) => (
          <option key={device.deviceId || index} value={device.deviceId}>
            {device.label || `${label} ${index + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Pre-join camera/mic check. Reports the chosen settings through onChange:
 * { microphoneEnabled, cameraEnabled, microphoneId, cameraId }
 * The preview stream is stopped on unmount so the call provider can take the devices.
 */
function DeviceCheck({ settings, onChange, displayName, showDevicePickers = true }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState({ cameras: [], microphones: [] });
  const [error, setError] = useState("");
  const { microphoneEnabled, cameraEnabled, microphoneId, cameraId } = settings;

  const update = useCallback(
    (changes) => onChange({ ...settings, ...changes }),
    [onChange, settings]
  );

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices({
      cameras: list.filter((device) => device.kind === "videoinput"),
      microphones: list.filter((device) => device.kind === "audioinput"),
    });
  }, []);

  // (Re)acquire the preview stream whenever devices or on/off state change
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) return undefined;
    if (!microphoneEnabled && !cameraEnabled) return undefined;

    let cancelled = false;
    let acquired = null;

    navigator.mediaDevices
      .getUserMedia({
        audio: microphoneEnabled
          ? microphoneId
            ? { deviceId: { exact: microphoneId } }
            : true
          : false,
        video: cameraEnabled
          ? cameraId
            ? { deviceId: { exact: cameraId } }
            : true
          : false,
      })
      .then((mediaStream) => {
        acquired = mediaStream;
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(mediaStream);
        setError("");
        // Labels are only populated after permission is granted
        refreshDevices();
      })
      .catch((mediaError) => {
        if (!cancelled) {
          setStream(null);
          setError(describeMediaError(mediaError));
        }
      });

    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((track) => track.stop());
    };
  }, [microphoneEnabled, cameraEnabled, microphoneId, cameraId, refreshDevices]);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    return () =>
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
  }, [refreshDevices]);

  const anyDeviceOn = microphoneEnabled || cameraEnabled;
  const activeStream = anyDeviceOn ? stream : null;
  const visibleError = !navigator.mediaDevices?.getUserMedia
    ? "Camera and microphone are unavailable on this page. Browsers only allow them over HTTPS or on localhost."
    : anyDeviceOn
      ? error
      : "";

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = activeStream;
  }, [activeStream]);

  const videoTrack = activeStream?.getVideoTracks()[0] || null;
  const audioTrack = activeStream?.getAudioTracks()[0] || null;

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full -scale-x-100 object-cover ${videoTrack ? "" : "hidden"}`}
        />
        {!videoTrack && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-gray-400">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-2xl font-semibold text-indigo-200">
              {(displayName.trim() || "?").slice(0, 1).toUpperCase()}
            </div>
            {cameraEnabled ? "Starting camera..." : "Camera is off"}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent pb-3 pt-8">
          <button
            type="button"
            onClick={() => update({ microphoneEnabled: !microphoneEnabled })}
            aria-label={microphoneEnabled ? "Turn microphone off" : "Turn microphone on"}
            className={`rounded-full p-3 text-white transition ${
              microphoneEnabled ? "bg-white/15 hover:bg-white/25" : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {microphoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          <button
            type="button"
            onClick={() => update({ cameraEnabled: !cameraEnabled })}
            aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
            className={`rounded-full p-3 text-white transition ${
              cameraEnabled ? "bg-white/15 hover:bg-white/25" : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {microphoneEnabled ? (
          <Mic size={16} className="shrink-0 text-gray-400" />
        ) : (
          <MicOff size={16} className="shrink-0 text-red-400" />
        )}
        <MicMeter track={audioTrack} />
        <button
          type="button"
          onClick={playTestTone}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/15"
        >
          <Volume2 size={14} />
          Test speaker
        </button>
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        {microphoneEnabled
          ? "Say something. The bar should move when you speak."
          : "Microphone is off. You will join muted."}
      </p>

      {showDevicePickers && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DeviceSelect
            label="Camera"
            devices={devices.cameras}
            value={cameraId || videoTrack?.getSettings().deviceId || ""}
            onChange={(value) => update({ cameraId: value })}
            disabled={!cameraEnabled}
          />
          <DeviceSelect
            label="Microphone"
            devices={devices.microphones}
            value={microphoneId || audioTrack?.getSettings().deviceId || ""}
            onChange={(value) => update({ microphoneId: value })}
            disabled={!microphoneEnabled}
          />
        </div>
      )}

      {visibleError && (
        <p role="alert" className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {visibleError}
        </p>
      )}
    </div>
  );
}

export default DeviceCheck;
