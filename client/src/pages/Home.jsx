
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video,
  Radio,
  Plus,
  LogIn,
  ArrowRight,
  Wifi,
} from "lucide-react";

const providers = [
  {
    id: "agora",
    name: "Agora",
    description: "Real-time communication",
  },
  {
    id: "daily",
    name: "Daily",
    description: "Video calling API",
  },
  {
    id: "livekit",
    name: "LiveKit",
    description: "WebRTC infrastructure",
  },
  {
    id: "jitsi",
    name: "Jitsi",
    description: "Open-source conferencing",
  },
];

function Home() {
  const navigate = useNavigate();

  const [provider, setProvider] = useState("agora");
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const openRoom = (id) => {
    if (!name.trim()) {
      alert("Please enter your display name");
      return;
    }

    navigate(`/room/${id}`, {
      state: {
        provider,
        name: name.trim(),
      },
    });
  };

  const createRoom = () => {
    const id = crypto.randomUUID().slice(0, 8);
    openRoom(id);
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
            Explore, integrate and compare different video calling
            providers using a single application.
          </p>
        </section>

        {/* Form */}
        <section className="rounded-2xl border border-white/10 bg-[#171a23] p-6 shadow-xl sm:p-8">

          {/* Display name */}
          <div className="mb-7">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Display Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-white/10 bg-[#0f1117] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-indigo-500"
            />
          </div>

          {/* Provider selection */}
          <div className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Select Video Provider
              </label>

              <span className="text-xs text-gray-500">
                {providers.length} available
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {providers.map((item) => {
                const selected = provider === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setProvider(item.id)}
                    className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-white/10 bg-[#0f1117] hover:border-white/30"
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2.5 ${
                        selected
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      <Radio size={20} />
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">
                        {item.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {item.description}
                      </p>
                    </div>

                    <div
                      className={`h-4 w-4 rounded-full border ${
                        selected
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-gray-600"
                      }`}
                    >
                      {selected && (
                        <div className="m-1 h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create room */}
          <button
            onClick={createRoom}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.99]"
          >
            <Plus size={18} />
            Create New Room
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
                if (e.key === "Enter" && roomId.trim()) {
                  openRoom(roomId.trim());
                }
              }}
              placeholder="Enter room ID"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0f1117] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
            />

            <button
              onClick={() => openRoom(roomId.trim())}
              disabled={!roomId.trim()}
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
