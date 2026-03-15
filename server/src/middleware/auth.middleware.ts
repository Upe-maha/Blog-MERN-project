import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";

interface JwtPayload {
    userId: string;
    email: string;
    role: string;
}

// Extend Express Request so downstream handlers can read req.user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

// Verify JWT token and ensure the account is not blocked
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "your-secret-key"
        ) as JwtPayload;

        // Re-check blocked status from DB on every request — the JWT alone cannot
        // reflect a block applied after the token was issued
        const user = await User.findById(decoded.userId).select("isBlocked role");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        if (user.isBlocked) {
            return res.status(403).json({
                message: "Your account has been blocked by an administrator. Please contact support.",
            });
        }

        req.user = { userId: decoded.userId, email: decoded.email, role: user.role };
        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

// Restrict route to admin role only — must follow authenticate middleware
export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
    }
    next();
};
