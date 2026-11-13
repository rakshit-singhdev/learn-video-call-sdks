import { useCallback, useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import CallInterface from "../../components/CallInterface.jsx";

const DEFAULT_MEDIA_SETTINGS = { microphoneEnabled: true, cameraEnabled: true };

// An Agora client can publish only one video track, so screen sharing uses a
// second client. The server issues its uid as `uid + 2^31`, which lets every
// participant recognise screen-share users.
const SCREEN_UID_OFFSET = 2 ** 31;
const isScreenUid = (uid) => Number(uid) >= SCREEN_UID_OFFSET;

function isPickerCancelled(error) {
  return /PERMISSION_DENIED|NotAllowed/i.test(`${error?.code} ${error?.name} ${error?.message}`);
}

function AgoraCall({
  credentials,
  displayName,
  roomName,
  mediaSettings = DEFAULT_MEDIA_SETTINGS,
  onLeave,
}) {
  const [participants, setParticipants] = useState([]);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(
    mediaSettings.microphoneEnabled
  );
  const [cameraEnabled, setCameraEnabled] = useState(mediaSettings.cameraEnabled);
  const [screenSharing, setScreenSharing] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");
  const localTracksRef = useRef([]);
  const screenShareRef = useRef(null); // { client, track }
  const updateParticipantsRef = useRef(() => {});
  const mediaStateRef = useRef({
    microphoneEnabled: mediaSettings.microphoneEnabled,
    cameraEnabled: mediaSettings.cameraEnabled,
  });
  const initialMediaRef = useRef(mediaSettings);

  const updateLocalParticipant = (changes) =>
    setParticipants((current) =>
      current.map((participant) =>
        participant.isLocal && !participant.isScreen
          ? { ...participant, ...changes }
          : participant
      )
    );

  // forcedState (boolean) sets the mic explicitly, e.g. for push-to-talk
  const toggleMicrophone = useCallback(async (forcedState) => {
    try {
      const next =
        typeof forcedState === "boolean" ? forcedState : !microphoneEnabled;
      await localTracksRef.current[0]?.setEnabled(next);
      mediaStateRef.current.microphoneEnabled = next;
      setMicrophoneEnabled(next);
      updateLocalParticipant({ audioEnabled: next });
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
      updateLocalParticipant({ cameraEnabled: next });
    } catch (toggleError) {
      setError(toggleError.message || "Unable to change camera state.");
    }
  }, [cameraEnabled]);

  const stopScreenShare = useCallback(async () => {
    const share = screenShareRef.current;
    if (!share) return;
    screenShareRef.current = null;
    setScreenSharing(false);
    updateParticipantsRef.current();
    try {
      await share.client.leave();
    } catch (leaveError) {
      console.error("Agora screen share leave error:", leaveError);
    } finally {
      share.track.close();
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!credentials.screenUid || !credentials.screenToken) {
      setError("Screen sharing is not available for this room. Rejoin to enable it.");
      return;
    }

    let track;
    let client;
    try {
      track = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: "1080p_1", optimizationMode: "detail" },
        "disable"
      );
      client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      await client.join(
        credentials.appId,
        credentials.channelName,
        credentials.screenToken,
        credentials.screenUid
      );
      await client.publish(track);

      screenShareRef.current = { client, track };
      // Fired when the user clicks the browser's own "Stop sharing" button
      track.on("track-ended", () => stopScreenShare());
      setScreenSharing(true);
      updateParticipantsRef.current();
    } catch (shareError) {
      track?.close();
      client?.leave().catch(() => {});
      if (!isPickerCancelled(shareError)) {
        setError(shareError.message || "Unable to share your screen.");
      }
    }
  }, [credentials, stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (screenShareRef.current) stopScreenShare();
    else startScreenShare();
  }, [startScreenShare, stopScreenShare]);

  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    let disposed = false;

    const updateParticipants = () => {
      if (disposed) return;
      const [microphoneTrack, cameraTrack] = localTracksRef.current;
      const localParticipants = [];
      if (microphoneTrack || cameraTrack) {
        localParticipants.push({
          id: `local-${credentials.uid}`,
          name: displayName,
          isLocal: true,
          audioTrack: microphoneTrack,
          videoTrack: cameraTrack,
          audioEnabled: Boolean(microphoneTrack) && mediaStateRef.current.microphoneEnabled,
          cameraEnabled: Boolean(cameraTrack) && mediaStateRef.current.cameraEnabled,
        });
      }
      if (screenShareRef.current) {
        localParticipants.push({
          id: `local-screen-${credentials.uid}`,
          name: displayName,
          isLocal: true,
          isScreen: true,
          videoTrack: screenShareRef.current.track,
          cameraEnabled: true,
          audioEnabled: false,
        });
      }

      const remoteParticipants = client.remoteUsers
        // Our own screen-share client shows up as a remote user; skip it
        .filter((user) => user.uid !== credentials.screenUid)
        .map((user) => {
          const isScreen = isScreenUid(user.uid);
          const ownerUid = isScreen ? Number(user.uid) - SCREEN_UID_OFFSET : user.uid;
          return {
            id: String(user.uid),
            name: `Participant ${ownerUid}`,
            isLocal: false,
            isScreen,
            audioTrack: user.audioTrack,
            videoTrack: user.videoTrack,
            audioEnabled: Boolean(user.audioTrack),
            cameraEnabled: Boolean(user.videoTrack),
          };
        });
      setParticipants([...localParticipants, ...remoteParticipants]);
    };
    updateParticipantsRef.current = updateParticipants;

    const handleUserPublished = async (user, mediaType) => {
      if (user.uid === credentials.screenUid) return;
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
        const { microphoneId, cameraId } = initialMediaRef.current;
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
          microphoneId ? { microphoneId } : undefined,
          cameraId ? { cameraId } : undefined
        );
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
        // Apply the pre-join choice (setEnabled on a published track unpublishes it)
        if (!mediaStateRef.current.microphoneEnabled) await tracks[0].setEnabled(false);
        if (!mediaStateRef.current.cameraEnabled) await tracks[1].setEnabled(false);
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

      const share = screenShareRef.current;
      screenShareRef.current = null;
      if (share) {
        share.client.leave().catch(() => {}).finally(() => share.track.close());
      }

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

export default AgoraCall;
