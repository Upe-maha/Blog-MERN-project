export interface User {
    _id: string;
    username: string;
    email: string;
    profilePicture?: string;
    role: "user" | "admin";
    isBlocked: boolean;
    createdAt: string;
    updatedAt: string;
}

// The list and the detail read return deliberately different shapes: a list row carries a
// stripped 200-char `excerpt` and omits the body entirely, so a feed of 9 posts no longer ships
// 180 KB of markdown nobody renders. Splitting the types means a component cannot silently read
// `description` off a row that never had one.
interface BlogBase {
    _id: string;
    title: string;
    imageUrl?: string;
    author: PublicAuthor;
    commentsCount: number;
    likesCount: number;
    // Optional, and false on anything a server component fetched: those requests carry no
    // token and their responses are cached for every viewer, so a per-user flag cannot be
    // trusted there. GET /likes/me/:blogId is the authority — see stores/likeStore.
    likedByMe?: boolean;
    readingMinutes: number;
    createdAt: string;
    updatedAt: string;
}

// GET /api/blogs only ever projects these two author fields — never email or role.
export interface PublicAuthor {
    _id: string;
    username: string;
    profilePicture?: string;
}

export interface BlogListItem extends BlogBase {
    excerpt: string;
}

export interface Blog extends BlogBase {
    description: string;
}

// Two shapes from one endpoint. The paged form (page/total/totalPages) backs the admin tables and
// the profile, where jumping to a numbered page matters. The cursor form (nextCursor, no total)
// backs the infinite feed, where a total is never displayed and computing one forces every matching
// document through the cursor just to be counted.
export interface BlogListResponse {
    blogs: BlogListItem[];
    limit: number;
    hasMore: boolean;
    page?: number;
    total?: number;
    currentPage?: number;
    totalPages?: number;
    nextCursor?: string | null;
}

// What GET /blogs/suggest returns per row, and all it returns: an id to navigate to and a title to
// show. Deliberately not a BlogListItem — a suggestion has no author, counts or excerpt to render,
// and typing it as one would invite a component to read fields the endpoint never sends.
export interface BlogSuggestion {
    _id: string;
    title: string;
}

// `user` is a PublicAuthor, not a User: the server populates only "username profilePicture"
// (plus _id), so typing it as User advertised an email and a role that are never in the payload.
export interface Comment {
    _id: string;
    blog: string;
    user: PublicAuthor;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface Like {
    _id: string;
    blog: string;
    user: User;
    createdAt: string;
}

export interface ApiResponse<T> {
    message: string;
    data?: T;
    error?: string;
}

export interface AuthResponse {
    message: string;
    user: User;
    token: string;
}
