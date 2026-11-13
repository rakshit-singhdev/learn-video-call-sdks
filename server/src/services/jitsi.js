const domain = (process.env.JITSI_DOMAIN || "meet.jit.si")
  .trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

export async function createJitsiRoom({ roomId, roomName }) {
  const jitsiRoomName = `video-call-lab-${roomId.replace(/-/g, "")}`;

  return {
    roomName: jitsiRoomName,
    displayName: roomName,
    domain,
    roomUrl: `https://${domain}/${jitsiRoomName}`,
  };
}

export async function joinJitsiRoom({ room, participantName }) {
  return {
    domain: room.domain,
    roomName: room.roomName,
    roomUrl: room.roomUrl,
    participantName,
    role: "participant",
  };
}

// Jitsi rooms are ephemeral; no server-side room resource needs deletion.
export async function deleteJitsiRoom() {}
