
const DAILY_API_URL = "https://api.daily.co/v1";

const DAILY_API_KEY = process.env.DAILY_API_KEY;

const ROOM_EXPIRY_SECONDS = 24 * 60 * 60;
const TOKEN_EXPIRY_SECONDS = 60 * 60;

async function dailyRequest(endpoint, method, body = null) {
  if (!DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is missing");
  }

  const response = await fetch(`${DAILY_API_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || data.info || `Daily API error: ${response.status}`
    );
  }

  return data;
}

// Create Daily room
export async function createDailyRoom({ roomId, roomName }) {
  const now = Math.floor(Date.now() / 1000);

  const room = await dailyRequest("/rooms", "POST", {
    name: `room-${roomId.replace(/-/g, "")}`,
    privacy: "private",
    properties: {
      exp: now + ROOM_EXPIRY_SECONDS,
      max_participants: 10,
      start_audio_off: false,
      start_video_off: false,
      enable_screenshare: true,
      enable_chat: true,
    },
  });

  return {
    roomName: room.name,
    roomUrl: room.url,
    providerRoomId: room.id,
    expiresAt: room.config?.exp || now + ROOM_EXPIRY_SECONDS,
  };
}

// Generate participant meeting token
export async function joinDailyRoom({
  room,
  participantId,
  participantName,
}) {
  const now = Math.floor(Date.now() / 1000);

  const tokenResponse = await dailyRequest(
    "/meeting-tokens",
    "POST",
    {
      properties: {
        room_name: room.roomName,
        user_name: participantName,
        exp: now + TOKEN_EXPIRY_SECONDS,
        eject_at_token_exp: true,
        start_audio_off: false,
        start_video_off: false,
      },
    }
  );

  return {
    roomUrl: room.roomUrl,
    token: tokenResponse.token,
    expiresAt: now + TOKEN_EXPIRY_SECONDS,
    role: "participant",
  };
}

export async function deleteDailyRoom(room) {
  await dailyRequest(`/rooms/${encodeURIComponent(room.roomName)}`, "DELETE");
}
