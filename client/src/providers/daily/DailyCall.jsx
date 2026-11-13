import { useCallback, useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import CallInterface from "../../components/CallInterface.jsx";

function getDailyTrack(participant, type) {
  const track = participant.tracks?.[type];
  if (!track || ["off", "blocked"].includes(track.state)) {
    return null;
  }
  return track.persistentTrack || track.track || null;
}

function DailyCall({ credentials, displayName, roomName, onLeave }) {
  const callObjectRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");

  const toggleMicrophone = useCallback(async () => {
    try {
      const next = !microphoneEnabled;
      await callObjectRef.current?.setLocalAudio(next);
      setMicrophoneEnabled(next);
    } catch (toggleError) {
      setError(toggleError.message || "Unable to change microphone state.");
    }
  }, [microphoneEnabled]);

  const toggleCamera = useCallback(async () => {
    try {
      const next = !cameraEnabled;
      await callObjectRef.current?.setLocalVideo(next);
      setCameraEnabled(next);
    } catch (toggleError) {
      setError(toggleError.message || "Unable to change camera state.");
    }
  }, [cameraEnabled]);

  useEffect(() => {
    const callObject = DailyIframe.createCallObject();
    callObjectRef.current = callObject;
    let disposed = false;

    const updateParticipants = () => {
      if (disposed) return;
      const dailyParticipants = Object.values(callObject.participants());
      setParticipants(
        dailyParticipants.map((participant) => {
          const videoTrack = getDailyTrack(participant, "video");
          const audioTrack = getDailyTrack(participant, "audio");
          return {
            id: participant.session_id,
            name: participant.user_name || "Guest",
            isLocal: participant.local,
            videoTrack,
            audioTrack,
            cameraEnabled: Boolean(videoTrack && participant.video !== false),
            audioEnabled: Boolean(audioTrack && participant.audio !== false),
          };
        })
      );
    };

    const handleError = (event) => {
      if (!disposed) {
        setError(event?.errorMsg || "Daily reported a call error.");
      }
    };

    const events = [
      "joined-meeting",
      "participant-joined",
      "participant-updated",
      "participant-left",
    ];
    events.forEach((event) => callObject.on(event, updateParticipants));
    callObject.on("error", handleError);

    const connect = async () => {
      try {
        await callObject.join({
          url: credentials.roomUrl,
          token: credentials.token,
          userName: displayName,
        });
        if (!disposed) {
          updateParticipants();
          setConnecting(false);
        }
      } catch (connectError) {
        if (!disposed) {
          setError(connectError.message || "Unable to connect to Daily.");
          setConnecting(false);
        }
      }
    };

    connect();

    return () => {
      disposed = true;
      events.forEach((event) => callObject.off(event, updateParticipants));
      callObject.off("error", handleError);
      void (async () => {
        try {
          await callObject.leave();
        } catch (leaveError) {
          console.error("Daily leave error:", leaveError);
        }
        try {
          await callObject.destroy();
        } catch (destroyError) {
          console.error("Daily cleanup error:", destroyError);
        }
      })();
      callObjectRef.current = null;
    };
  }, [credentials, displayName]);

  return (
    <CallInterface
      provider="daily"
      roomName={roomName}
      participants={participants}
      microphoneEnabled={microphoneEnabled}
      cameraEnabled={cameraEnabled}
      onToggleMicrophone={toggleMicrophone}
      onToggleCamera={toggleCamera}
      onLeave={onLeave}
      connecting={connecting}
      error={error}
    />
  );
}

export default DailyCall;
