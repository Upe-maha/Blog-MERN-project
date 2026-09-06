import express from "express";
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import {
    getAllUsersAdmin,
    toggleBlockUser,
    setUserRole,
    deleteUserAdmin,
    getAllBlogsAdmin,
    deleteAnyBlog,
    getAdminStats,
} from "../controllers/admin.controller.js";
import {
    adminBlogsQuery,
    adminUsersQuery,
    objectIdParam,
    setRoleSchema,
} from "../schemas/index.js";

const adminRouter = express.Router();

// Router-level, so a route added below cannot forget it. requireAdmin chains after authenticate,
// which re-reads the role from Mongo rather than trusting the one in the token.
adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/stats", getAdminStats);

adminRouter.get("/users", validate({ query: adminUsersQuery }), getAllUsersAdmin);
adminRouter.patch("/users/:id/block", validate({ params: objectIdParam }), toggleBlockUser);
adminRouter.post(
    "/users/:id/role",
    validate({ params: objectIdParam, body: setRoleSchema }),
    setUserRole
);
adminRouter.delete("/users/:id", validate({ params: objectIdParam }), deleteUserAdmin);

adminRouter.get("/blogs", validate({ query: adminBlogsQuery }), getAllBlogsAdmin);
adminRouter.delete("/blogs/:id", validate({ params: objectIdParam }), deleteAnyBlog);

export default adminRouter;
