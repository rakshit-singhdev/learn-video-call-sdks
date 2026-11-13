import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Copy, Video } from "lucide-react";
import { apiRequest } from "../services/api.js";
import DeviceCheck from "../components/DeviceCheck.jsx";

const providerCalls = {
  agora: lazy(() => import("../providers/agora/AgoraCall.jsx")),
  daily: lazy(() => import("../providers/daily/DailyCall.jsx")),
  livekit: lazy(() => import("../providers/livekit/LiveKitCall.jsx")),
  jitsi: lazy(() => import("../providers/jitsi/JitsiCall.jsx")),
};

function CallRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [displayName, setDisplayName] = useState(location.state?.name || "");
  const [credentials, setCredentials] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [mediaSettings, setMediaSettings] = useState({
    microphoneEnabled: true,
    cameraEnabled: true,
    microphoneId: "",
    cameraId: "",
  });

  useEffect(() => {
    let active = true;

    apiRequest(`/api/rooms/${encodeURIComponent(roomId)}`)
      .then(({ data }) => {
        if (active) setRoom(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load this room.");
      })
      .finally(() => {
        if (active) setLoadingRoom(false);
      });

    return () => {
      active = false;
    };
  }, [roomId]);

  const leaveCall = useCallback(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  const joinCall = async (event) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError("Enter your display name to join the call.");
      return;
    }

    setJoining(true);
    setError("");
    try {
      const response = await apiRequest(
        `/api/rooms/${encodeURIComponent(roomId)}/join`,
        {
          method: "POST",
          body: JSON.stringify({ participantName: name }),
        }
      );
      if (response.data.provider !== room.provider) {
        throw new Error("The room provider changed. Reload the room and try again.");
      }
      if (!providerCalls[response.data.provider]) {
        throw new Error("This room uses an unsupported video provider.");
      }
      setDisplayName(name);
      setCredentials(response.data);
    } catch (joinError) {
      setError(joinError.message || "Unable to join this room.");
    } finally {
      setJoining(false);
    }
  };

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy the room link. Copy it from your browser address bar.");
    }
  };

  if (credentials) {
    const CallProvider = providerCalls[credentials.provider];
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#0f1117] text-gray-300">
            Loading call provider...
          </div>
        }
      >
        <CallProvider
          credentials={credentials}
          displayName={displayName}
          roomName={room?.roomName || roomId}
          mediaSettings={mediaSettings}
          onLeave={leaveCall}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-gray-300 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Back
          </button>
          <button
            type="button"
            onClick={copyRoomLink}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15"
          >
            <Copy size={16} />
            {copied ? "Copied" : "Copy invite link"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:items-start lg:py-14">
        <section className="rounded-2xl border border-white/10 bg-[#171a23] p-4 shadow-xl sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-300">
            Check your camera and microphone
          </h2>
          <DeviceCheck
            settings={mediaSettings}
            onChange={setMediaSettings}
            displayName={displayName}
            showDevicePickers={room?.provider !== "jitsi"}
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#171a23] p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <Video size={24} />
          </div>
          <h1 className="text-2xl font-bold">Join video call</h1>
          <p className="flex gap-2 mt-2 text-sm text-gray-400">
            Room ID: <span className="font-mono text-gray-200">{roomId}</span> <span className="text-gray-200"><Copy size={16} className="cursor-pointer" onClick={() => copyRoomLink()}/></span>
          </p>
          {room && (
            <p className="mt-1 text-sm capitalize text-gray-400">
              Provider: {room.provider}
            </p>
          )}

          {loadingRoom ? (
            <p className="mt-8 text-sm text-gray-400">Loading room...</p>
          ) : room ? (
            <form onSubmit={joinCall} className="mt-8">
              <label
                htmlFor="participant-name"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Display name
              </label>
              <input
                id="participant-name"
                autoComplete="name"
                maxLength={50}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-lg border border-white/10 bg-[#0f1117] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={joining || !displayName.trim()}
                className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join call"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Return home
            </button>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export default CallRoom;
