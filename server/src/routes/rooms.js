
import { Router } from "express";
import crypto from "crypto";
import {
  getVideoProviderService,
  VIDEO_PROVIDER,
} from "../config/provider.js";

const router = Router();

// Temporary in-memory room storage
const rooms = new Map();

// Standard API response
function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// Create room
router.post("/", async (req, res) => {
  try {
    const { provider, roomName } = req.body;

    if (provider !== undefined && provider !== VIDEO_PROVIDER) {
      return sendError(res, 400, `This server uses the ${VIDEO_PROVIDER} provider`);
    }

    if (
      roomName !== undefined &&
      (typeof roomName !== "string" || roomName.trim().length > 100)
    ) {
      return sendError(res, 400, "Invalid room name");
    }

    const roomId = crypto.randomUUID();

    const name = roomName?.trim() || `room-${roomId.slice(0, 8)}`;

    const service = await getVideoProviderService();
    const providerData = await service.create({
      roomId,
      roomName: name,
    });

    const room = {
      roomId,
      roomName: name,
      provider: VIDEO_PROVIDER,
      createdAt: new Date(),
      ...providerData,
    };

    rooms.set(roomId, room);

    return res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Create room error:", error);

    return sendError(res, 500, "Failed to create room");
  }
});

// Join room
router.post("/:id/join", async (req, res) => {
  try {
    const room = rooms.get(req.params.id);

    if (!room) {
      return sendError(res, 404, "Room not found");
    }

    const { participantName } = req.body;

    if (
      typeof participantName !== "string" ||
      !participantName.trim() ||
      participantName.trim().length > 50
    ) {
      return sendError(res, 400, "Invalid participant name");
    }

    const participantId = crypto.randomUUID();

    const service = await getVideoProviderService();
    const providerData = await service.join({
      room,
      participantId,
      participantName: participantName.trim(),
    });

    return res.status(200).json({
      success: true,
      data: {
        roomId: room.roomId,
        provider: room.provider,
        participantId,
        participantName: participantName.trim(),
        ...providerData,
      },
    });
  } catch (error) {
    console.error("Join room error:", error);

    return sendError(res, 500, "Failed to join room");
  }
});

// Get room details
router.get("/:id", (req, res) => {
  const room = rooms.get(req.params.id);

  if (!room) {
    return sendError(res, 404, "Room not found");
  }

  return res.status(200).json({
    success: true,
    data: {
      roomId: room.roomId,
      roomName: room.roomName,
      provider: room.provider,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
    },
  });
});

// Delete room
router.delete("/:id", async (req, res) => {
  try {
    const room = rooms.get(req.params.id);

    if (!room) {
      return sendError(res, 404, "Room not found");
    }

    // Delete room from the selected provider
    const service = await getVideoProviderService();
    await service.delete(room);

    // Remove local record only after provider cleanup succeeds
    rooms.delete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
      data: {
        roomId: room.roomId,
        provider: room.provider,
      },
    });
  } catch (error) {
    console.error("Delete room error:", error);

    return sendError(res, 502, "Provider room cleanup failed");
  }
});

export default router;
