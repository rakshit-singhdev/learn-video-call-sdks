
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const {
  DEFAULT_VIDEO_PROVIDER,
  VIDEO_PROVIDERS,
} = await import("./config/provider.js");
const { default: roomsRouter } = await import("./routes/rooms.js");

const app = express();

const clientOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      const localDevelopmentOrigin =
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");

      if (!origin || clientOrigins.includes(origin) || localDevelopmentOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Video Call Lab API is running",
    provider: DEFAULT_VIDEO_PROVIDER,
    defaultProvider: DEFAULT_VIDEO_PROVIDER,
    providers: VIDEO_PROVIDERS,
  });
});

app.use("/api/rooms", roomsRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
