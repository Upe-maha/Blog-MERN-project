import express from "express";
import { toggleLike, getMyLike, getLikesByBlog } from "../controllers/like.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { writeLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { blogIdParam, listLikesQuery } from "../schemas/index.js";

const likeRouter = express.Router();

// One idempotent-per-click toggle replaces POST /likes + POST /likes/unlike, both of which took the
// user id from the request body. The liker is the token holder and nothing else.
likeRouter.post(
    "/:blogId/toggle",
    authenticate,
    writeLimiter,
    validate({ params: blogIdParam }),
    toggleLike
);

// "me" is the token, not a path segment. The route this replaces was /check/:blogId/:userId, which
// let any caller read any other account's like state.
likeRouter.get("/me/:blogId", authenticate, validate({ params: blogIdParam }), getMyLike);

likeRouter.get(
    "/blog/:blogId",
    validate({ params: blogIdParam, query: listLikesQuery }),
    getLikesByBlog
);

export default likeRouter;
