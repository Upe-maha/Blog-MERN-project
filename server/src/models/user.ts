import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    profilePicture: string;
    role: "user" | "admin";
    isBlocked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
    username:       { type: String, required: true },
    email:          { type: String, required: true, unique: true },
    password:       { type: String, required: true },
    profilePicture: { type: String, default: "" },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    isBlocked: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.model<IUser>("User", userSchema);

export default User;
