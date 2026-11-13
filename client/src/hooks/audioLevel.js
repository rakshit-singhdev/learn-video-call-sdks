// Provider-agnostic audio level reading.
// - Agora tracks expose getVolumeLevel() directly.
// - LiveKit tracks expose .mediaStreamTrack, Daily gives a raw MediaStreamTrack;
//   those are measured with a Web Audio AnalyserNode.

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function toMediaStreamTrack(track) {
  if (!track) return null;
  if (typeof MediaStreamTrack !== "undefined" && track instanceof MediaStreamTrack) {
    return track;
  }
  if (typeof track.getMediaStreamTrack === "function") {
    return track.getMediaStreamTrack();
  }
  return track.mediaStreamTrack || null;
}

// Map a raw amplitude (0..1) to a perceptual 0..1 level (-55 dB .. -10 dB).
export function normalizeLevel(amplitude) {
  if (!amplitude || amplitude <= 0) return 0;
  const decibels = 20 * Math.log10(amplitude);
  return Math.min(1, Math.max(0, (decibels + 55) / 45));
}

export function createAudioLevelReader(track) {
  if (!track) return null;

  if (typeof track.getVolumeLevel === "function") {
    return {
      read: () => track.getVolumeLevel() || 0,
      dispose() {},
    };
  }

  const mediaStreamTrack = toMediaStreamTrack(track);
  const context = getAudioContext();
  if (!mediaStreamTrack || !context) return null;

  const source = context.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.3;
  source.connect(analyser);
  const samples = new Float32Array(analyser.fftSize);

  return {
    read() {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      return Math.sqrt(sum / samples.length);
    },
    dispose() {
      source.disconnect();
      analyser.disconnect();
    },
  };
}
