import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsOverview {
  totalStudents: number;
  enrolledStudents: number;
  completedStudents: number;
  completionRate: number;
  totalRevenue: number;
}

export interface QuizStatistics {
  totalAttempts: number;
  passedAttempts: number;
  failureRate: number;
  averageScore: number;
}

export interface ChapterEngagement {
  chapterId: string;
  title: string;
  chapterNumber: number;
  studentProgress: number;
  quizCount: number;
}

export interface Analytics {
  overview: AnalyticsOverview;
  quizStatistics: QuizStatistics;
  chapterEngagement: ChapterEngagement[];
}

export interface StudentSummary {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: string;
  completedChapters: number;
  totalChapters: number;
  completionPercentage: number;
  passedQuizzes: number;
  averageQuizScore: number;
}

export interface StudentChapterProgress {
  chapterId: string;
  chapterNumber: number;
  title: string;
  status: string;
  videoWatched: boolean;
  videoProgress: number;
  quizPassed: boolean;
  bestQuizScore: number;
}

export interface StudentDetail {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: string;
  completedChapters: number;
  totalChapters: number;
  completionPercentage: number;
  passedQuizzes: number;
  averageQuizScore: number;
  chapterProgress: StudentChapterProgress[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CouponData {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  usageLimit: number;
  timesUsed: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface CouponCreate {
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  usageLimit?: number;
  expiresAt?: string;
}

export interface ChapterUpdate {
  title?: string;
  description?: string;
  contentHtml?: string;
  videoVimeoId?: string;
  videoDurationSeconds?: number;
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const adminApi = {
  getAnalytics: async (): Promise<Analytics> => {
    const { data } = await apiClient.get<{ success: boolean; data: Analytics }>(
      '/admin/analytics'
    );
    return data.data;
  },

  getStudents: async (
    page = 1,
    limit = 20
  ): Promise<{ students: StudentSummary[]; pagination: Pagination }> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: { students: StudentSummary[]; pagination: Pagination };
    }>('/admin/students', { params: { page, limit } });
    return data.data;
  },

  getStudentDetail: async (id: string): Promise<StudentDetail> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: StudentDetail;
    }>(`/admin/students/${id}`);
    return data.data;
  },

  updateChapter: async (id: string, update: ChapterUpdate): Promise<void> => {
    await apiClient.put(`/admin/chapters/${id}`, update);
  },

  getCoupons: async (): Promise<CouponData[]> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: { coupons: CouponData[] };
    }>('/admin/coupons');
    return data.data.coupons;
  },

  createCoupon: async (coupon: CouponCreate): Promise<CouponData> => {
    const { data } = await apiClient.post<{ success: boolean; data: CouponData }>(
      '/admin/coupons',
      coupon
    );
    return data.data;
  },

  updateCoupon: async (id: string, update: Partial<CouponCreate> & { isActive?: boolean }): Promise<CouponData> => {
    const { data } = await apiClient.put<{ success: boolean; data: CouponData }>(
      `/admin/coupons/${id}`,
      update
    );
    return data.data;
  },

  deleteCoupon: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/coupons/${id}`);
  },
};
