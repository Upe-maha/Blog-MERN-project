import express from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";
import {
    getAllUsersAdmin,
    toggleBlockUser,
    deleteUserAdmin,
    getAllBlogsAdmin,
    deleteAnyBlog,
} from "../controllers/admin.controller";

const adminRouter = express.Router();

// All routes below require a valid JWT and admin role
adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/users",              getAllUsersAdmin);
adminRouter.patch("/users/:id/block",  toggleBlockUser);
adminRouter.delete("/users/:id",       deleteUserAdmin);
adminRouter.get("/blogs",              getAllBlogsAdmin);
adminRouter.delete("/blogs/:id",       deleteAnyBlog);

export default adminRouter;
