// One import site for schemas and their inferred types, so controllers don't reach into
// individual schema files and routers stay readable.
export {
    registerSchema,
    loginSchema,
    updateMeSchema,
    objectIdParam,
    type RegisterInput,
    type LoginInput,
    type UpdateMeInput,
    type ObjectIdParam,
} from "./user.schema.js";

export {
    createBlogSchema,
    updateBlogSchema,
    listBlogsQuery,
    suggestBlogsQuery,
    type CreateBlogInput,
    type UpdateBlogInput,
    type ListBlogsQuery,
    type SuggestBlogsQuery,
} from "./blog.schema.js";

export {
    objectIdString,
    blogIdParam,
    paginationQuery,
    type BlogIdParam,
} from "./common.schema.js";

export {
    commentBodySchema,
    listCommentsQuery,
    type CommentBodyInput,
    type ListCommentsQuery,
} from "./comment.schema.js";

export { listLikesQuery, type ListLikesQuery } from "./like.schema.js";

export {
    adminUsersQuery,
    adminBlogsQuery,
    setRoleSchema,
    type AdminUsersQuery,
    type AdminBlogsQuery,
    type SetRoleInput,
} from "./admin.schema.js";
