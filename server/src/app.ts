import express from "express";
import userRouter from "./routers/userRouter";

const app = express();

app.use(express.json());

app.use("/api/users", userRouter);

export default app;