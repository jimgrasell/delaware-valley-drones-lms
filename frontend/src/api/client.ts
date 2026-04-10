import axios from 'axios';

// VITE_API_URL is set per-environment:
//   - local dev: leave unset (or "/api/v1") and Vite proxies /api to the
//     backend on port 3000 (see vite.config.ts)
//   - production: set on the static-site component to your backend URL,
//     e.g. https://delaware-valley-drones-lms-app-u8wzb.ondigitalocean.app/api/v1
const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Tokens flow as Authorization: Bearer <jwt>, not cookies, so we don't
  // need credentials.
  withCredentials: false,
});

// ---------------------------------------------------------------------------
// Types mirroring the backend response shapes. Kept narrow on purpose — we
// only declare what this proof-of-life page actually consumes.
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
