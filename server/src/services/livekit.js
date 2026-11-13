
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

const ROOM_EXPIRY_SECONDS = 24 * 60 * 60;
const TOKEN_EXPIRY_SECONDS = 60 * 60;

function validateConfig() {
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LiveKit credentials are missing");
  }
}

function getRoomService() {
  validateConfig();

  return new RoomServiceClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET
  );
}

// Create LiveKit room
export async function createLiveKitRoom({ roomId, roomName }) {
  validateConfig();

  const service = getRoomService();

  const livekitRoomName = `room-${roomId.replace(/-/g, "")}`;

  const room = await service.createRoom({
    name: livekitRoomName,
    emptyTimeout: 300,
    departureTimeout: 20,
    maxParticipants: 10,
    metadata: JSON.stringify({
      roomId,
      roomName,
    }),
  });

  return {
    roomName: room.name,
    providerRoomId: room.sid,
    serverUrl: LIVEKIT_URL,
    expiresAt:
      Math.floor(Date.now() / 1000) + ROOM_EXPIRY_SECONDS,
  };
}

// Generate participant access token
export async function joinLiveKitRoom({
  room,
  participantId,
  participantName,
}) {
  validateConfig();

  const accessToken = new AccessToken(
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    {
      identity: participantId,
      name: participantName,
      ttl: TOKEN_EXPIRY_SECONDS,
    }
  );

  accessToken.addGrant({
    roomJoin: true,
    room: room.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await accessToken.toJwt();

  return {
    serverUrl: LIVEKIT_URL,
    roomName: room.roomName,
    token,
    expiresAt:
      Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
    role: "publisher",
  };
}

export async function deleteLiveKitRoom(room) {
  const service = getRoomService();
  await service.deleteRoom(room.roomName);
}
