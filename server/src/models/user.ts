import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    profilePicture: string;
    profilePicturePublicId?: string;
    role: "user" | "admin";
    bootstrapAdmin?: number;
    passwordChangedAt?: Date;
    isBlocked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
    {
        username: { type: String, required: true, trim: true, minlength: 3, maxlength: 32 },
        email: {
            type: String,
            required: true,
            unique: true,
            // Without lowercase+trim, "A@x.com" and "a@x.com" are two separate accounts.
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
        },
        // select:false so password is never returned by accident. Login must ask for it explicitly
        // with .select("+password").
        password: { type: String, required: true, select: false },
        profilePicture: { type: String, default: "" },
        profilePicturePublicId: { type: String },
        role: { type: String, enum: ["user", "admin"], default: "user" },

        // Set to 1 on the single account that claimed admin during first-run setup, and never
        // again. The sparse unique index below is what makes the claim atomic: two simultaneous
        // signups both see "no admin yet", both try to insert, and Mongo rejects the second with
        // E11000. A count-then-create check cannot do that — it has a window between the two.
        //
        // Admins promoted later from the dashboard leave this unset, so they never collide.
        bootstrapAdmin: { type: Number },

        // When the password was last changed, and unset on accounts that have never changed one.
        // Every token carries the value it was minted against, so a password change retires the
        // sessions that existed before it: a JWT has no revocation list, and the only thing that can
        // out-vote one is a fact in the database that the request path already reads.
        passwordChangedAt: { type: Date },
        isBlocked: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound, not a bare { role: 1 }: the admin list filters by role and then sorts by createdAt,
// and a single-field index can serve only the filter, leaving the sort to run in memory.
userSchema.index({ role: 1, createdAt: -1 });

// The admin list's default order, and its two alternative sorts. Without these, every load of
// /admin/users was an in-memory SORT — which is capped at 32 MB and fails outright above it, rather
// than degrading.
userSchema.index({ createdAt: -1 });
userSchema.index({ username: 1 });

// The lock. `sparse` means documents without the field are not indexed at all, so only the one
// bootstrap admin occupies it.
userSchema.index({ bootstrapAdmin: 1 }, { unique: true, sparse: true });

const User = mongoose.model<IUser>("User", userSchema);

export default User;
