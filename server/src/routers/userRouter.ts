import express from "express";
import {
    registerUser,
    loginUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} from "../controllers/user.controller";
import { uploadProfilePicture } from "../config/multer";

const userRouter = express.Router();

// POST register user (with profile picture upload)
userRouter.post("/", uploadProfilePicture, registerUser);

// POST login user
userRouter.post("/login", loginUser);

// GET all users
userRouter.get("/", getAllUsers);

// GET user by ID
userRouter.get("/:id", getUserById);

// PUT update user (with profile picture upload)
userRouter.put("/:id", uploadProfilePicture, updateUser);

// DELETE user
userRouter.delete("/:id", deleteUser);

export default userRouter;