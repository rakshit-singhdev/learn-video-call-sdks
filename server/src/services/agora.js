
import crypto from "crypto";
import agoraToken from "agora-token";

const { RtcTokenBuilder, RtcRole } = agoraToken;

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Token validity: 1 hour
const TOKEN_EXPIRY_SECONDS = 60 * 60;

// Screen share runs as a second Agora client. Its uid is `uid + 2^31`, so
// participant uids stay below 2^31 and clients can recognise screen users.
const SCREEN_UID_OFFSET = 2 ** 31;

function buildToken(channelName, uid) {
  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    TOKEN_EXPIRY_SECONDS,
    TOKEN_EXPIRY_SECONDS
  );
}

// Create Agora room configuration
export async function createAgoraRoom({ roomId, roomName }) {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error("Agora credentials are missing");
  }

  // Agora channel names must be unique and less than 64 bytes.
  const channelName = `room_${roomId.replace(/-/g, "")}`;

  return {
    channelName,
    appId: APP_ID,
    roomName,
  };
}

// Generate participant token
export async function joinAgoraRoom({
  room,
  participantId,
  participantName,
}) {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error("Agora credentials are missing");
  }

  const uid = crypto.randomInt(1, SCREEN_UID_OFFSET);
  const screenUid = uid + SCREEN_UID_OFFSET;

  const token = buildToken(room.channelName, uid);
  const screenToken = buildToken(room.channelName, screenUid);

  const expiresAt =
    Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;

  return {
    appId: APP_ID,
    channelName: room.channelName,
    uid,
    token,
    screenUid,
    screenToken,
    expiresAt,
    role: "publisher",
  };
}

// Agora channels are implicit and require no server-side room deletion.
export async function deleteAgoraRoom() {}
