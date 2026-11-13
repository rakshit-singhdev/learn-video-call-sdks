
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import os from "os";
dotenv.config();

const {
  DEFAULT_VIDEO_PROVIDER,
  VIDEO_PROVIDERS,
} = await import("./config/provider.js");
const { default: roomsRouter } = await import("./routes/rooms.js");

const app = express();

app.use(morgan("dev", { immediate: true }));

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
    defaultProvider: DEFAULT_VIDEO_PROVIDER,
    providers: VIDEO_PROVIDERS,
  });
});

app.use("/api/rooms", roomsRouter);

const PORT = process.env.PORT || 5000;

const ip = Object.values(os.networkInterfaces())
  .flat()
  .find(({ family, internal }) => family === "IPv4" && !internal)?.address;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://${ip}:${PORT}`);
});

// Fail loudly if another process already holds the port
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use. Another server is probably still running.\n` +
        `Find it:  lsof -nP -iTCP:${PORT} -sTCP:LISTEN\n` +
        `Kill it:  kill -9 <PID>\n`
    );
  } else {
    console.error("Server error:", error);
  }
  process.exit(1);
});

// Release the port cleanly when nodemon restarts or you press Ctrl+C
function shutdown(signal) {
  console.log(`${signal} received, closing server...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
