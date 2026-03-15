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

export interface Blog {
    _id: string;
    title: string;
    description: string;
    imageUrl?: string;
    author: User;
    commentsCount: number;
    likesCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface Comment {
    _id: string;
    blog: string;
    user: User;
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
