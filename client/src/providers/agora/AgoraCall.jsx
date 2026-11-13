import { useCallback, useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import CallInterface from "../../components/CallInterface.jsx";

function AgoraCall({ credentials, displayName, roomName, onLeave }) {
  const [participants, setParticipants] = useState([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");
  const localTracksRef = useRef([]);
  const mediaStateRef = useRef({ microphoneEnabled: true, cameraEnabled: true });

  const toggleMicrophone = useCallback(async () => {
    try {
      const next = !microphoneEnabled;
      await localTracksRef.current[0]?.setEnabled(next);
      mediaStateRef.current.microphoneEnabled = next;
      setMicrophoneEnabled(next);
      setParticipants((current) =>
        current.map((participant) =>
          participant.isLocal
            ? { ...participant, audioEnabled: next }
            : participant
        )
      );
    } catch (toggleError) {
      setError(toggleError.message || "Unable to change microphone state.");
    }
  }, [microphoneEnabled]);

  const toggleCamera = useCallback(async () => {
    try {
      const next = !cameraEnabled;
      await localTracksRef.current[1]?.setEnabled(next);
      mediaStateRef.current.cameraEnabled = next;
      setCameraEnabled(next);
      setParticipants((current) =>
        current.map((participant) =>
          participant.isLocal
            ? { ...participant, cameraEnabled: next }
            : participant
        )
      );
    } catch (toggleError) {
      setError(toggleError.message || "Unable to change camera state.");
    }
  }, [cameraEnabled]);

  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    let disposed = false;

    const updateParticipants = () => {
      if (disposed) return;
      const [microphoneTrack, cameraTrack] = localTracksRef.current;
      const localParticipant = microphoneTrack
        ? [
            {
              id: `local-${credentials.uid}`,
              name: displayName,
              isLocal: true,
              audioTrack: microphoneTrack,
              videoTrack: cameraTrack,
              audioEnabled: mediaStateRef.current.microphoneEnabled,
              cameraEnabled: mediaStateRef.current.cameraEnabled,
            },
          ]
        : [];
      const remoteParticipants = client.remoteUsers.map((user) => ({
        id: String(user.uid),
        name: `Participant ${user.uid}`,
        isLocal: false,
        audioTrack: user.audioTrack,
        videoTrack: user.videoTrack,
        audioEnabled: Boolean(user.audioTrack),
        cameraEnabled: Boolean(user.videoTrack),
      }));
      setParticipants([...localParticipant, ...remoteParticipants]);
    };

    const handleUserPublished = async (user, mediaType) => {
      try {
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") user.audioTrack?.play();
        updateParticipants();
      } catch (subscribeError) {
        if (!disposed) {
          setError(subscribeError.message || "Unable to subscribe to a participant.");
        }
      }
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", updateParticipants);
    client.on("user-left", updateParticipants);

    const connect = async () => {
      try {
        await client.join(
          credentials.appId,
          credentials.channelName,
          credentials.token,
          credentials.uid
        );
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (disposed) {
          try {
            await client.leave();
          } finally {
            tracks.forEach((track) => track.close());
          }
          return;
        }

        localTracksRef.current = tracks;
        await client.publish(tracks);
        updateParticipants();
        setConnecting(false);
      } catch (connectError) {
        if (!disposed) {
          setError(connectError.message || "Unable to connect to Agora.");
          setConnecting(false);
        }
      }
    };

    connect();

    return () => {
      disposed = true;
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", updateParticipants);
      client.off("user-left", updateParticipants);
      const tracks = localTracksRef.current;
      localTracksRef.current = [];
      client.leave().catch((leaveError) => {
        console.error("Agora leave error:", leaveError);
      }).finally(() => {
        tracks.forEach((track) => track.close());
      });
    };
  }, [credentials, displayName]);

  return (
    <CallInterface
      provider="agora"
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

export default AgoraCall;
