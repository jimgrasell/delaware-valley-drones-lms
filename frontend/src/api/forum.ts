import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ForumAuthor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  isMarkedAsAnswer: boolean;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
}

export interface ForumPost {
  id: string;
  authorId: string;
  title: string;
  content: string;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isClosed: boolean;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
  replies?: ForumReply[];
}

export interface ForumPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const forumApi = {
  getPosts: async (
    page = 1,
    limit = 20,
    sort = 'newest'
  ): Promise<{ posts: ForumPost[]; pagination: ForumPagination }> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: { posts: ForumPost[]; pagination: ForumPagination };
    }>('/forum/posts', { params: { page, limit, sort } });
    return data.data;
  },

  getPost: async (id: string): Promise<ForumPost> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: ForumPost;
    }>(`/forum/posts/${id}`);
    return data.data;
  },

  createPost: async (title: string, content: string): Promise<ForumPost> => {
    const { data } = await apiClient.post<{
      success: boolean;
      data: ForumPost;
    }>('/forum/posts', { title, content });
    return data.data;
  },

  createReply: async (postId: string, content: string): Promise<ForumReply> => {
    const { data } = await apiClient.post<{
      success: boolean;
      data: ForumReply;
    }>(`/forum/posts/${postId}/replies`, { content });
    return data.data;
  },
};
