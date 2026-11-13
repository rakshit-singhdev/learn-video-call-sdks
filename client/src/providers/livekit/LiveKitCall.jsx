import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import CallInterface from "../../components/CallInterface.jsx";

const DEFAULT_MEDIA_SETTINGS = { microphoneEnabled: true, cameraEnabled: true };

function getTrack(participant, source) {
  return participant.getTrackPublication(source)?.track || null;
}

function getParticipants(room) {
  const allParticipants = [
    room.localParticipant,
    ...room.remoteParticipants.values(),
  ];

  return allParticipants.flatMap((participant) => {
    const isLocal = participant === room.localParticipant;
    const name = participant.name || participant.identity;
    const videoTrack = getTrack(participant, Track.Source.Camera);
    const audioTrack = getTrack(participant, Track.Source.Microphone);
    const screenTrack = getTrack(participant, Track.Source.ScreenShare);

    const tiles = [
      {
        id: participant.identity,
        name,
        isLocal,
        videoTrack,
        audioTrack,
        cameraEnabled: Boolean(videoTrack && !videoTrack.isMuted),
        audioEnabled: Boolean(audioTrack && !audioTrack.isMuted),
      },
    ];

    if (screenTrack) {
      tiles.push({
        id: `${participant.identity}-screen`,
        name,
        isLocal,
        isScreen: true,
        videoTrack: screenTrack,
        cameraEnabled: true,
        audioEnabled: false,
      });
    }

    return tiles;
  });
}

function isPickerCancelled(error) {
  return error?.name === "NotAllowedError" || error?.name === "AbortError";
}

function LiveKitCall({
  credentials,
  roomName,
  mediaSettings = DEFAULT_MEDIA_SETTINGS,
  onLeave,
}) {
  const roomRef = useRef(null);
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
      await roomRef.current.localParticipant.setMicrophoneEnabled(next);
      setMicrophoneEnabled(next);
    } catch (toggleError) {
      setError(toggleError.message || "Unable to change microphone state.");
    }
  }, [microphoneEnabled]);

  const toggleCamera = useCallback(async () => {
    try {
      const next = !cameraEnabled;
      await roomRef.current.localParticipant.setCameraEnabled(next);
      setCameraEnabled(next);
    } catch (toggleError) {
      setError(toggleError.message || "Unable to change camera state.");
    }
  }, [cameraEnabled]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(
        !room.localParticipant.isScreenShareEnabled
      );
    } catch (shareError) {
      if (!isPickerCancelled(shareError)) {
        setError(shareError.message || "Unable to share your screen.");
      }
    }
  }, []);

  useEffect(() => {
    const initialMedia = initialMediaRef.current;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      // Selected devices are used whenever mic/camera get enabled
      audioCaptureDefaults: initialMedia.microphoneId
        ? { deviceId: initialMedia.microphoneId }
        : undefined,
      videoCaptureDefaults: initialMedia.cameraId
        ? { deviceId: initialMedia.cameraId }
        : undefined,
    });
    roomRef.current = room;
    let disposed = false;

    const updateParticipants = () => {
      if (disposed) return;
      setParticipants(getParticipants(room));
      setScreenSharing(room.localParticipant.isScreenShareEnabled);
    };

    const events = [
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
    ];
    events.forEach((event) => room.on(event, updateParticipants));

    const connect = async () => {
      try {
        await room.connect(credentials.serverUrl, credentials.token);
        await room.localParticipant.setMicrophoneEnabled(initialMedia.microphoneEnabled);
        await room.localParticipant.setCameraEnabled(initialMedia.cameraEnabled);
        if (!disposed) {
          updateParticipants();
          setConnecting(false);
        }
      } catch (connectError) {
        if (!disposed) {
          setError(connectError.message || "Unable to connect to LiveKit.");
          setConnecting(false);
        }
      }
    };

    connect();

    return () => {
      disposed = true;
      events.forEach((event) => room.off(event, updateParticipants));
      room.disconnect();
      roomRef.current = null;
    };
  }, [credentials]);

  return (
    <CallInterface
      provider="livekit"
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

export default LiveKitCall;
