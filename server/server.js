import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Import Route Modules
import authRoutes from "./routes/auth.js";
import clubRoutes from "./routes/clubs.js";
import eventRoutes from "./routes/events.js";
import slotRoutes from "./routes/slots.js";
import memberRoutes from "./routes/members.js";
import signupRoutes from "./routes/signup.js";

const corsOptions = {
  origin: [
    "http://localhost:5173", // 允许你本地开发调试
    /\.web\.app$/, // 允许你未来的 Firebase 域名 (xxx.web.app)
    /\.firebaseapp\.com$/, // 允许你未来的 Firebase 预演域名
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // 如果你的登录用到了 Cookie 或 Session，这一行必须有
};

dotenv.config();
const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Database Connection
const uri = process.env.MONGODB_URI;
// "mongodb+srv://frieda1:Lsy19980315!@lab3.hrhuswu.mongodb.net/?retryWrites=true&w=majority&appName=lab3";

mongoose
  .connect(uri, { dbName: "myApp" })
  .then(() => console.log("✅ Database Connected"))
  .catch((err) => console.error("❌ Connection Error:", err));

// Route Mounting
app.use("/api/auth", authRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/slot", slotRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/signup", signupRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
