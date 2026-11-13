
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video,
  Plus,
  LogIn,
  ArrowRight,
  Wifi,
} from "lucide-react";
import ProviderSelector from "../components/ProviderSelector.jsx";
import { apiRequest } from "../services/api.js";

function Home() {
  const navigate = useNavigate();

  const [enabledProviders, setEnabledProviders] = useState([]);
  const [provider, setProvider] = useState(null);
  const [checkingServer, setCheckingServer] = useState(true);
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    apiRequest("/health")
      .then(({ provider: legacyProvider, defaultProvider, providers }) => {
        const nextProviders = Array.isArray(providers)
          ? providers
          : legacyProvider
            ? [legacyProvider]
            : [];
        const selectedProvider = defaultProvider || legacyProvider;
        const supportedProviders = ["agora", "daily", "livekit", "jitsi"];

        if (
          nextProviders.length === 0 ||
          nextProviders.some(
            (enabledProvider) => !supportedProviders.includes(enabledProvider)
          ) ||
          !nextProviders.includes(selectedProvider)
        ) {
          throw new Error("The server reported an unsupported video provider");
        }
        if (active) {
          setEnabledProviders(nextProviders);
          setProvider(selectedProvider);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message || "Unable to connect to the server");
        }
      })
      .finally(() => {
        if (active) setCheckingServer(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openRoom = (id) => {
    if (!name.trim()) {
      setError("Enter your display name before joining a room.");
      return;
    }

    setError("");
    navigate(`/room/${id}`, {
      state: {
        name: name.trim(),
      },
    });
  };

  const createRoom = async () => {
    if (!name.trim()) {
      setError("Enter your display name before creating a room.");
      return;
    }

    if (!provider) {
      setError("The video server is unavailable.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await apiRequest("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ provider }),
      });
      navigate(`/room/${response.data.roomId}`, {
        state: { name: name.trim() },
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to create the room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-600 p-2">
              <Video size={20} />
            </div>

            <span className="text-lg font-semibold tracking-tight">
              Video Call Lab
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Developer Playground
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        {/* Hero */}
        <section className="mb-12 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <Video size={28} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Video Calling Playground
          </h1>

          <p className="mt-4 text-sm leading-6 text-gray-400 sm:text-base">
            Create rooms with any provider enabled by the server, or join an
            existing room using its provider.
          </p>
        </section>

        {/* Form */}
        <section className="rounded-2xl border border-white/10 bg-[#171a23] p-6 shadow-xl sm:p-8">

          {/* Display name */}
          <div className="mb-7">
            <label
              htmlFor="display-name"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Display Name
            </label>

            <input
              id="display-name"
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-white/10 bg-[#0f1117] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-indigo-500"
            />
          </div>

          {/* Provider selection */}
          <div className="mb-7">
            <ProviderSelector
              enabledProviders={enabledProviders}
              selectedProvider={provider}
              onSelect={(selectedProvider) => {
                setProvider(selectedProvider);
                setError("");
              }}
              loading={checkingServer}
            />
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {/* Create room */}
          <button
            onClick={createRoom}
            disabled={
              busy ||
              checkingServer ||
              !enabledProviders.includes(provider) ||
              !name.trim()
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            {busy ? "Creating room..." : "Create New Room"}
            <ArrowRight size={17} />
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-gray-500">OR JOIN EXISTING ROOM</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Join room */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && roomId.trim() && !busy) {
                  openRoom(roomId.trim());
                }
              }}
              placeholder="Enter room ID"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0f1117] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
            />

            <button
              onClick={() => openRoom(roomId.trim())}
              disabled={!roomId.trim() || !name.trim() || busy}
              className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LogIn size={17} />
              Join Room
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Wifi size={14} />
          Compare video calling technologies in one place
        </footer>
      </main>
    </div>
  );
}

export default Home;
