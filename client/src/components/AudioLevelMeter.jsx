import { useEffect, useRef } from "react";
import { createAudioLevelReader, normalizeLevel } from "../hooks/audioLevel.js";

const BAR_WEIGHTS = [0.55, 1, 0.55];
const SPEAKING_THRESHOLD = 0.3;
const SPEAKING_HOLD_MS = 400;

// Three animated bars driven by requestAnimationFrame. Bars are updated via
// refs (no React re-render per frame); onSpeakingChange fires only on change.
function AudioLevelMeter({ track, enabled, onSpeakingChange }) {
  const barsRef = useRef([]);
  const onSpeakingChangeRef = useRef(onSpeakingChange);

  useEffect(() => {
    onSpeakingChangeRef.current = onSpeakingChange;
  }, [onSpeakingChange]);

  useEffect(() => {
    const setBars = (level) => {
      barsRef.current.forEach((bar, index) => {
        if (bar) {
          bar.style.transform = `scaleY(${0.2 + level * BAR_WEIGHTS[index] * 0.8})`;
        }
      });
    };

    setBars(0);
    if (!enabled || !track) return undefined;

    let reader;
    try {
      reader = createAudioLevelReader(track);
    } catch (readerError) {
      console.warn("Audio level meter unavailable:", readerError);
    }
    if (!reader) return undefined;

    let frame;
    let level = 0;
    let speaking = false;
    let lastLoudAt = 0;

    const tick = (now) => {
      const target = normalizeLevel(reader.read());
      // Fast attack, slow release so bars don't flicker
      level = target > level ? target : level * 0.85 + target * 0.15;
      setBars(level);

      if (level > SPEAKING_THRESHOLD) lastLoudAt = now;
      const nextSpeaking = now - lastLoudAt < SPEAKING_HOLD_MS;
      if (nextSpeaking !== speaking) {
        speaking = nextSpeaking;
        onSpeakingChangeRef.current?.(speaking);
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      reader.dispose();
      if (speaking) onSpeakingChangeRef.current?.(false);
    };
  }, [track, enabled]);

  return (
    <span
      className="flex h-6 w-6 items-center justify-center gap-[3px] rounded-full bg-indigo-500/80"
      aria-hidden="true"
    >
      {BAR_WEIGHTS.map((_, index) => (
        <span
          key={index}
          ref={(element) => {
            barsRef.current[index] = element;
          }}
          className="h-3 w-[3px] rounded-full bg-white transition-transform duration-75"
          style={{ transform: "scaleY(0.2)" }}
        />
      ))}
    </span>
  );
}

export default AudioLevelMeter;
