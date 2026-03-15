import type { Request, Response } from "express";
import User from "../models/user";
import { hashPassword, comparePassword } from "../utils/hashPassword";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const getImageUrl = (filename: string | undefined, folder: string): string => {
    if (!filename) return "";
    return `/uploads/${folder}/${filename}`;
};

const deleteOldImage = (imageUrl: string) => {
    if (!imageUrl) return;
    const imagePath = path.join(process.cwd(), imageUrl);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
};

// Check if any admin exists — called by the register page before rendering
export const checkAdminExists = async (_req: Request, res: Response) => {
    try {
        const admin = await User.findOne({ role: "admin" }).select("_id");
        return res.status(200).json({ adminExists: !!admin });
    } catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Register User
export const registerUser = async (req: Request, res: Response) => {
    const { username, email, password, role } = req.body;
    const file = req.file;

    if (!username || !email || !password) {
        if (file) deleteOldImage(`/uploads/profiles/${file.filename}`);
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // Only allow admin registration if no admin exists yet
        if (role === "admin") {
            const existingAdmin = await User.findOne({ role: "admin" });
            if (existingAdmin) {
                if (file) deleteOldImage(`/uploads/profiles/${file.filename}`);
                return res.status(400).json({
                    message: "An admin already exists. You can only register as a normal user.",
                });
            }
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (file) deleteOldImage(`/uploads/profiles/${file.filename}`);
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await hashPassword(password);
        const profilePicture = file ? getImageUrl(file.filename, "profiles") : "";

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            profilePicture,
            role: role === "admin" ? "admin" : "user",
        });

        await newUser.save();

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                profilePicture: newUser.profilePicture,
                role: newUser.role,
                isBlocked: newUser.isBlocked,
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt,
            },
        });
    } catch (error) {
        if (file) deleteOldImage(`/uploads/profiles/${file.filename}`);
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Login User
export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Blocked users receive a clear notification and cannot proceed
        if (user.isBlocked) {
            return res.status(403).json({
                message: "Your account has been blocked by an administrator. Please contact support.",
            });
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Include role in the JWT so middleware can do role checks without a DB hit
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Login successful",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                role: user.role,
                isBlocked: user.isBlocked,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            token,
        });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Get All Users
export const getAllUsers = async (_req: Request, res: Response) => {
    try {
        const users = await User.find().select("-password");
        return res.status(200).json({ users });
    } catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Get User by ID
export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ user });
    } catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Update User
export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, email } = req.body;
    const file = req.file;

    try {
        const user = await User.findById(id);
        if (!user) {
            if (file) deleteOldImage(`/uploads/profiles/${file.filename}`);
            return res.status(404).json({ message: "User not found" });
        }

        if (file && user.profilePicture) deleteOldImage(user.profilePicture);

        const updateData: Record<string, unknown> = {};
        if (username) updateData.username = username;
        if (email)    updateData.email = email;
        if (file)     updateData.profilePicture = getImageUrl(file.filename, "profiles");

        const updatedUser = await User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).select("-password");

        return res.status(200).json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
        if (file) deleteOldImage(`/uploads/profiles/${file.filename}`);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Delete User
export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.profilePicture) deleteOldImage(user.profilePicture);
        await User.findByIdAndDelete(id);
        return res.status(200).json({ message: "User deleted successfully" });
    } catch {
        return res.status(500).json({ message: "Internal server error" });
    }
};
