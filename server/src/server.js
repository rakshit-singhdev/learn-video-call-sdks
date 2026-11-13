
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const { VIDEO_PROVIDER } = await import("./config/provider.js");
const { default: roomsRouter } = await import("./routes/rooms.js");

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
}));

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Video Call Lab API is running",
    provider: VIDEO_PROVIDER,
  });
});

app.use("/api/rooms", roomsRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
