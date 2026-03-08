import type { Request, Response } from "express";
import User from "../models/user";
import { hashPassword, comparePassword } from "../utils/hashPassword";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

// Helper function to get image URL
const getImageUrl = (filename: string | undefined, folder: string): string => {
    if (!filename) return "";
    return `/uploads/${folder}/${filename}`;
};

// Helper function to delete old image
const deleteOldImage = (imageUrl: string) => {
    if (!imageUrl) return;

    const imagePath = path.join(process.cwd(), imageUrl);
    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
    }
};

// Register User with Profile Picture
export const registerUser = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;
    const file = req.file;

    if (!username || !email || !password) {
        // Delete uploaded file if validation fails
        if (file) deleteOldImage(`/uploads/profiles/${file.filename}`);
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (file) deleteOldImage(`/uploads/profiles/${file.filename}`);
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await hashPassword(password);

        // Generate profile picture URL
        const profilePicture = file ? getImageUrl(file.filename, "profiles") : "";

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            profilePicture,
        });

        await newUser.save();

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                profilePicture: newUser.profilePicture,
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

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
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
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select("-password");
        return res.status(200).json({ users });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Get User by ID
export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Update User with Profile Picture
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

        // If new profile picture uploaded, delete old one
        if (file && user.profilePicture) {
            deleteOldImage(user.profilePicture);
        }

        const updateData: any = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (file) updateData.profilePicture = getImageUrl(file.filename, "profiles");

        const updatedUser = await User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).select("-password");

        return res.status(200).json({
            message: "User updated successfully",
            user: updatedUser,
        });
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
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete profile picture from disk
        if (user.profilePicture) {
            deleteOldImage(user.profilePicture);
        }

        await User.findByIdAndDelete(id);
        return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};