import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types — match the backend StudentService getProgress() shape.
// ---------------------------------------------------------------------------

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface ChapterProgress {
  chapterId: string;
  chapterNumber: number;
  title: string;
  status: ProgressStatus;
  videoWatched: boolean;
  videoProgress: number;
  quizPassed: boolean;
  bestQuizScore: number;
  completedAt: string | null;
}

export interface ProgressData {
  userId: string;
  totalChapters: number;
  completedChapters: number;
  overallProgress: number;
  chapters: ChapterProgress[];
}

interface ProgressResponse {
  success: boolean;
  message: string;
  data: ProgressData;
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const studentsApi = {
  getProgress: async (): Promise<ProgressData> => {
    const { data } = await apiClient.get<ProgressResponse>(
      '/students/progress'
    );
    return data.data;
  },
};
