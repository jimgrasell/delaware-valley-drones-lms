import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types mirroring the backend response shapes. Kept narrow on purpose — we
// only declare what the consuming pages actually use.
// ---------------------------------------------------------------------------

export type ChapterProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface ChapterProgressSummary {
  status: ChapterProgressStatus;
  videoWatched: boolean;
  videoProgress: number;
  quizPassed: boolean;
  bestQuizScore: number;
}

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
  progress: ChapterProgressSummary | null;
}

export interface ChaptersResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    chapters: Chapter[];
  };
}

export interface ChapterResponse {
  success: boolean;
  message: string;
  data: Chapter;
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const chaptersApi = {
  list: async (): Promise<ChaptersResponse> => {
    const { data } = await apiClient.get<ChaptersResponse>('/chapters');
    return data;
  },

  getById: async (id: string): Promise<Chapter> => {
    const { data } = await apiClient.get<ChapterResponse>(`/chapters/${id}`);
    return data.data;
  },

  markCompleted: async (id: string): Promise<void> => {
    await apiClient.put(`/chapters/${id}/mark-completed`);
  },
};
