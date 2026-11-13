import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import CallInterface from "../../components/CallInterface.jsx";

function getLiveKitTrack(participant, kind) {
  const publication = [...participant.trackPublications.values()].find(
    (item) => item.kind === kind
  );
  return publication?.track || null;
}

function getParticipants(room) {
  const allParticipants = [
    room.localParticipant,
    ...room.remoteParticipants.values(),
  ];

  return allParticipants.map((participant) => {
    const videoTrack = getLiveKitTrack(participant, Track.Kind.Video);
    const audioTrack = getLiveKitTrack(participant, Track.Kind.Audio);
    return {
      id: participant.identity,
      name: participant.name || participant.identity,
      isLocal: participant === room.localParticipant,
      videoTrack,
      audioTrack,
      cameraEnabled: Boolean(videoTrack && !videoTrack.isMuted),
      audioEnabled: Boolean(audioTrack && !audioTrack.isMuted),
    };
  });
}

function LiveKitCall({ credentials, roomName, onLeave }) {
  const roomRef = useRef(null);
  const [participants, setParticipants] = useState([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");

  const toggleMicrophone = useCallback(async () => {
    try {
      const next = !microphoneEnabled;
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

  useEffect(() => {
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    let disposed = false;

    const updateParticipants = () => {
      if (!disposed) setParticipants(getParticipants(room));
    };

    const events = [
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
    ];
    events.forEach((event) => room.on(event, updateParticipants));

    const connect = async () => {
      try {
        await room.connect(credentials.serverUrl, credentials.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
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
      onToggleMicrophone={toggleMicrophone}
      onToggleCamera={toggleCamera}
      onLeave={onLeave}
      connecting={connecting}
      error={error}
    />
  );
}

export default LiveKitCall;
