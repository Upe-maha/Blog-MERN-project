import apiClient from "@/lib/api";

// The shape both endpoints answer with. The count is the server's, not a number the client
// maintains — see the note in likeStore about drift.
export interface LikeState {
    liked: boolean;
    likesCount: number;
}

// Moved out of blogService.ts, where it had been sharing a file with an unrelated resource. No
// userId in any signature: the server reads the liker from the verified token.
export const likeService = {
    toggle: async (blogId: string) => {
        const response = await apiClient.post<LikeState>(`/likes/${blogId}/toggle`);
        return response.data;
    },

    // The viewer's own state for one post. Needed because the pages that render a like button are
    // server-rendered anonymously and cached, so the `likedByMe` in their payload is always false.
    getMine: async (blogId: string) => {
        const response = await apiClient.get<LikeState>(`/likes/me/${blogId}`);
        return response.data;
    },
};
