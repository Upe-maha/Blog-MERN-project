import express from "express";
import cors from "cors";
import path from "path";
import userRouter from "./routers/userRouter.js";
import blogRouter from "./routers/blogRouter.js";
import commentRouter from "./routers/commentRouter.js";
import likeRouter from "./routers/likeRouter.js";
import adminRouter from "./routers/adminRouter.js";

const app = express();

// Middleware
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/users", userRouter);
app.use("/api/blogs", blogRouter);
app.use("/api/comments", commentRouter);
app.use("/api/likes", likeRouter);
app.use("/api/admin", adminRouter);

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "Server is running" });
});

export default app;