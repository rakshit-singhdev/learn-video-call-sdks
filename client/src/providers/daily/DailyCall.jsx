import { useCallback, useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";
import CallInterface from "../../components/CallInterface.jsx";

const DEFAULT_MEDIA_SETTINGS = { microphoneEnabled: true, cameraEnabled: true };

function getDailyTrack(participant, type) {
  const track = participant.tracks?.[type];
  if (!track || ["off", "blocked"].includes(track.state)) {
    return null;
  }
  return track.persistentTrack || track.track || null;
}

function toParticipants(dailyParticipants) {
  return dailyParticipants.flatMap((participant) => {
    const videoTrack = getDailyTrack(participant, "video");
    const audioTrack = getDailyTrack(participant, "audio");
    const screenTrack = getDailyTrack(participant, "screenVideo");
    const name = participant.user_name || "Guest";

    const tiles = [
      {
        id: participant.session_id,
        name,
        isLocal: participant.local,
        videoTrack,
        audioTrack,
        cameraEnabled: Boolean(videoTrack && participant.video !== false),
        audioEnabled: Boolean(audioTrack && participant.audio !== false),
      },
    ];

    if (screenTrack) {
      tiles.push({
        id: `${participant.session_id}-screen`,
        name,
        isLocal: participant.local,
        isScreen: true,
        videoTrack: screenTrack,
        cameraEnabled: true,
        audioEnabled: false,
      });
    }

    return tiles;
  });
}

function DailyCall({
  credentials,
  displayName,
  roomName,
  mediaSettings = DEFAULT_MEDIA_SETTINGS,
  onLeave,
}) {
  const callObjectRef = useRef(null);
  const initialMediaRef = useRef(mediaSettings);
  const [participants, setParticipants] = useState([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(
    mediaSettings.microphoneEnabled
  );
  const [cameraEnabled, setCameraEnabled] = useState(mediaSettings.cameraEnabled);
  const [screenSharing, setScreenSharing] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");

  // forcedState (boolean) sets the mic explicitly, e.g. for push-to-talk
  const toggleMicrophone = useCallback(async (forcedState) => {
    try {
      const next =
        typeof forcedState === "boolean" ? forcedState : !microphoneEnabled;
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

  const toggleScreenShare = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;
    // State is updated by the local-screen-share-* events below
    if (screenSharing) callObject.stopScreenShare();
    else callObject.startScreenShare();
  }, [screenSharing]);

  useEffect(() => {
    const initialMedia = initialMediaRef.current;
    const callObject = DailyIframe.createCallObject({
      audioSource: initialMedia.microphoneId || true,
      videoSource: initialMedia.cameraId || true,
      startAudioOff: !initialMedia.microphoneEnabled,
      startVideoOff: !initialMedia.cameraEnabled,
    });
    callObjectRef.current = callObject;
    let disposed = false;

    const updateParticipants = () => {
      if (disposed) return;
      setParticipants(toParticipants(Object.values(callObject.participants())));
    };

    const handleError = (event) => {
      if (!disposed) {
        setError(event?.errorMsg || "Daily reported a call error.");
      }
    };

    const handleScreenShareStarted = () => {
      if (!disposed) setScreenSharing(true);
    };
    const handleScreenShareStopped = () => {
      if (!disposed) setScreenSharing(false);
    };

    const events = [
      "joined-meeting",
      "participant-joined",
      "participant-updated",
      "participant-left",
      "track-started",
      "track-stopped",
    ];
    events.forEach((event) => callObject.on(event, updateParticipants));
    callObject.on("error", handleError);
    callObject.on("local-screen-share-started", handleScreenShareStarted);
    callObject.on("local-screen-share-stopped", handleScreenShareStopped);

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
      callObject.off("local-screen-share-started", handleScreenShareStarted);
      callObject.off("local-screen-share-stopped", handleScreenShareStopped);
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
      screenSharing={screenSharing}
      onToggleMicrophone={toggleMicrophone}
      onToggleCamera={toggleCamera}
      onToggleScreenShare={toggleScreenShare}
      onLeave={onLeave}
      connecting={connecting}
      error={error}
    />
  );
}

export default DailyCall;
