import { useEffect, useRef, useState } from "react";
import CallInterface from "../../components/CallInterface.jsx";

const jitsiScriptPromises = new Map();

function loadJitsiApi(domain) {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();

  if (!jitsiScriptPromises.has(domain)) {
    const scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Unable to load the Jitsi client."));
      document.head.appendChild(script);
    }).catch((error) => {
      jitsiScriptPromises.delete(domain);
      throw error;
    });
    jitsiScriptPromises.set(domain, scriptPromise);
  }

  return jitsiScriptPromises.get(domain);
}

function JitsiCall({ credentials, displayName, roomName, onLeave }) {
  const containerRef = useRef(null);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    let api;

    const connect = async () => {
      try {
        await loadJitsiApi(credentials.domain);
        if (disposed || !containerRef.current) return;

        api = new window.JitsiMeetExternalAPI(credentials.domain, {
          roomName: credentials.roomName,
          parentNode: containerRef.current,
          userInfo: { displayName },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
        });
        api.addListener("videoConferenceJoined", () => setConnecting(false));
        api.addListener("videoConferenceLeft", onLeave);
      } catch (connectError) {
        if (!disposed) {
          setError(connectError.message || "Unable to join the Jitsi room.");
          setConnecting(false);
        }
      }
    };

    connect();

    return () => {
      disposed = true;
      api?.dispose();
    };
  }, [credentials, displayName, onLeave]);

  return (
    <CallInterface
      provider="jitsi"
      roomName={roomName}
      participants={[]}
      microphoneEnabled={false}
      cameraEnabled={false}
      onLeave={onLeave}
      mediaControls={false}
      connecting={connecting}
      error={error}
    >
      <div
        ref={containerRef}
        className="min-h-[65vh] overflow-hidden rounded-xl border border-white/10 bg-[#171a23]"
      />
    </CallInterface>
  );
}

export default JitsiCall;
