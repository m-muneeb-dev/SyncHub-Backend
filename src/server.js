require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
// const rateLimit = require("express-rate-limit");

const authRouter = require("./routes/auth.route");
const taskRouter = require("./routes/task.route");
const friendRequestRoutes = require("./routes/friend.route");
const sharedTaskRoutes = require("./routes/shared.task.routes"); // Added Shared Task Routes
const { errorHandler } = require("./middlewares/error.middleware");

const app = express();
app.set("trust proxy", 1);
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGINS
      ? process.env.CLIENT_ORIGINS.split(",").map((o) => o.trim())
      : ["http://localhost:3000", "https://synchub-khaki.vercel.app"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/friends", friendRequestRoutes);
app.use("/api/shared-tasks", sharedTaskRoutes); // Mounted Shared Task Routes

// Health check endpoint for Railway / uptime monitors
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "SyncHub Backend API is running" });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);
const port = process.env.PORT || 5000;

let server;
const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
    return server;
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = { app, startServer };
