import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuizMeta {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  totalQuestions: number;
  timeLimit: number | null;
  allowRetakes: boolean;
  maxRetakes: number;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
}

export interface QuizOption {
  id: string;
  optionText: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  type: string;
  points: number;
  figureRef: string | null;
  options: QuizOption[];
}

export interface QuizStart {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  totalQuestions: number;
  timeLimit: number | null;
  questions: QuizQuestion[];
  startedAt: string;
}

export interface SubmitAnswer {
  questionId: string;
  selectedOptionId: string;
}

export interface QuizResult {
  attemptId: string;
  score: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  passingScore: number;
  timeSpentSeconds: number;
  earnedPoints: number;
  totalPoints: number;
  showCorrectAnswers: boolean;
}

export interface AnswerReview {
  questionId: string;
  questionText: string;
  figureRef: string | null;
  selectedOptionId: string | null;
  answerText: string | null;
  isCorrect: boolean;
  earnedPoints: number;
  correctOption: { id: string; optionText: string } | null;
  explanation: string | null;
}

export interface AttemptResults {
  attemptId: string;
  quizId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  questionsAnswered: number;
  passingScore: number;
  timeSpentSeconds: number;
  startedAt: string;
  completedAt: string;
  answers: AnswerReview[];
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const quizzesApi = {
  /** Get quiz metadata for a chapter (id, title, passingScore, etc.) */
  getChapterQuizzes: async (chapterId: string): Promise<QuizMeta[]> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: { quizzes: QuizMeta[] };
    }>(`/chapters/${chapterId}/quizzes`);
    return data.data.quizzes;
  },

  /** Fetch questions and start a new attempt */
  startQuiz: async (quizId: string): Promise<QuizStart> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: QuizStart;
    }>(`/quizzes/${quizId}`);
    return data.data;
  },

  /** Submit answers for grading */
  submitQuiz: async (
    quizId: string,
    attemptId: string,
    answers: SubmitAnswer[]
  ): Promise<QuizResult> => {
    const { data } = await apiClient.post<{
      success: boolean;
      data: QuizResult;
    }>(`/quizzes/${quizId}/submit`, { attemptId, answers });
    return data.data;
  },

  /** Get detailed results with answer review */
  getAttemptResults: async (attemptId: string): Promise<AttemptResults> => {
    const { data } = await apiClient.get<{
      success: boolean;
      data: AttemptResults;
    }>(`/quizzes/attempts/${attemptId}/results`);
    return data.data;
  },
};
