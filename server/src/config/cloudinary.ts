import { v2 as cloudinary } from "cloudinary";
import { env } from "../env.js";

// Configured once, at import. env.ts has already exited the process if any of these is missing, so
// there is no half-configured state to defend against here.
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
});

export { cloudinary };
