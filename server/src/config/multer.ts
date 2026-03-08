import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads directories if they don't exist
const createUploadDirs = () => {
    const dirs = ["uploads", "uploads/profiles", "uploads/blogs"];
    dirs.forEach((dir) => {
        const dirPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });
};

createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine folder based on fieldname or route
        let uploadPath = "uploads/";

        if (file.fieldname === "profilePicture") {
            uploadPath = "uploads/profiles/";
        } else if (file.fieldname === "blogImage") {
            uploadPath = "uploads/blogs/";
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Create unique filename: timestamp-randomstring.extension
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

// File filter - only allow images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."));
    }
};

// Multer upload configurations
export const uploadProfilePicture = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max for profile pictures
    },
}).single("profilePicture");

export const uploadBlogImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max for blog images
    },
}).single("blogImage");

// Generic upload for multiple use cases
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});

export default upload;