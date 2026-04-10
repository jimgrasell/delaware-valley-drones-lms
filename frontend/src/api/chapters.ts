import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types mirroring the backend response shapes. Kept narrow on purpose — we
// only declare what the consuming pages actually use.
// ---------------------------------------------------------------------------

export interface Chapter {
  id: string;
  title: string;
  description: string;
  chapterNumber: number;
  content: string | null;
  videoUrl: string | null;
  videoVimeoId: string | null;
  videoDurationSeconds: number;
  downloadUrl: string | null;
  isPublished: boolean;
  order: number;
  quizCount: number;
  progress: unknown | null;
}

export interface ChaptersResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    chapters: Chapter[];
  };
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const chaptersApi = {
  list: async (): Promise<ChaptersResponse> => {
    const { data } = await apiClient.get<ChaptersResponse>('/chapters');
    return data;
  },
};
