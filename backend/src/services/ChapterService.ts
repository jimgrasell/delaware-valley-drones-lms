import { AppDataSource } from '../config/database';
import { Chapter } from '../models/Chapter';
import { ChapterProgress } from '../models/ChapterProgress';
import { Quiz } from '../models/Quiz';
import { AppError } from '../middleware/errorHandler';

export class ChapterService {
  private chapterRepository = AppDataSource.getRepository(Chapter);
  private chapterProgressRepository = AppDataSource.getRepository(ChapterProgress);
  private quizRepository = AppDataSource.getRepository(Quiz);

  /**
   * Get all chapters with optional student progress
   */
  async getChapters(userId?: string) {
    const chapters = await this.chapterRepository.find({
      relations: ['quizzes'],
      order: { order: 'ASC' },
    });

    if (!userId) {
      return chapters.map((ch) => this.formatChapter(ch));
    }

    // Get student progress for each chapter
    const progressMap = await this.chapterProgressRepository.find({
      where: { userId },
    });

    return chapters.map((ch) => {
      const progress = progressMap.find((p) => p.chapterId === ch.id);
      return this.formatChapter(ch, progress);
    });
  }

  /**
   * Get single chapter by ID with optional student progress
   */
  async getChapter(chapterId: string, userId?: string) {
    const chapter = await this.chapterRepository.findOne({
      where: { id: chapterId },
      relations: ['quizzes'],
    });

    if (!chapter) {
      throw new AppError('Chapter not found', 404, 'CHAPTER_NOT_FOUND');
    }

    if (!userId) {
      return this.formatChapter(chapter);
    }

    // Get student progress
    const progress = await this.chapterProgressRepository.findOne({
      where: { userId, chapterId },
    });

    return this.formatChapter(chapter, progress);
  }

  /**
   * Mark chapter video as watched
   */
  async markVideoWatched(chapterId: string, userId: string) {
    const chapter = await this.chapterRepository.findOne({ where: { id: chapterId } });
    if (!chapter) {
      throw new AppError('Chapter not found', 404, 'CHAPTER_NOT_FOUND');
    }

    let progress = await this.chapterProgressRepository.findOne({
      where: { userId, chapterId },
    });

    if (!progress) {
      progress = this.chapterProgressRepository.create({
        userId,
        chapterId,
        status: 'in_progress',
        videoWatched: true,
        videoProgress: 100,
        videoWatchedAt: new Date(),
      });
    } else {
      progress.videoWatched = true;
      progress.videoProgress = 100;
      progress.videoWatchedAt = new Date();

      // Update status to in_progress if not started
      if (progress.status === 'not_started') {
        progress.status = 'in_progress';
      }
    }

    await this.chapterProgressRepository.save(progress);

    return {
      chapterId,
      videoWatched: true,
      videoProgress: 100,
      status: progress.status,
    };
  }

  /**
   * Update video progress (for resume functionality)
   */
  async updateVideoProgress(chapterId: string, userId: string, progress: number) {
    if (progress < 0 || progress > 100) {
      throw new AppError('Progress must be between 0 and 100', 400, 'INVALID_PROGRESS');
    }

    const chapter = await this.chapterRepository.findOne({ where: { id: chapterId } });
    if (!chapter) {
      throw new AppError('Chapter not found', 404, 'CHAPTER_NOT_FOUND');
    }

    let chapterProgress = await this.chapterProgressRepository.findOne({
      where: { userId, chapterId },
    });

    if (!chapterProgress) {
      chapterProgress = this.chapterProgressRepository.create({
        userId,
        chapterId,
        status: 'in_progress',
        videoProgress: progress,
      });
    } else {
      chapterProgress.videoProgress = progress;

      // Mark as watched if 90% complete
      if (progress >= 90) {
        chapterProgress.videoWatched = true;
        chapterProgress.videoWatchedAt = new Date();
      }

      // Update status to in_progress if not started
      if (chapterProgress.status === 'not_started') {
        chapterProgress.status = 'in_progress';
      }
    }

    await this.chapterProgressRepository.save(chapterProgress);

    return {
      chapterId,
      videoProgress: progress,
      videoWatched: chapterProgress.videoWatched,
      status: chapterProgress.status,
    };
  }

  /**
   * Get chapter quiz(zes)
   */
  async getChapterQuizzes(chapterId: string) {
    const quizzes = await this.quizRepository.find({
      where: { chapterId },
      relations: ['questions'],
      order: { order: 'ASC' },
    });

    return quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      totalQuestions: quiz.totalQuestions,
      passingScore: quiz.passingScore,
      timeLimit: quiz.timeLimit,
      allowRetakes: quiz.allowRetakes,
      maxRetakes: quiz.maxRetakes,
      questionCount: quiz.questions?.length || 0,
    }));
  }

  /**
   * Check if chapter can be accessed (gating logic)
   */
  async canAccessChapter(chapterId: string, userId?: string): Promise<boolean> {
    const chapter = await this.chapterRepository.findOne({ where: { id: chapterId } });
    if (!chapter) {
      return false;
    }

    // If no user, published chapters are accessible
    if (!userId) {
      return chapter.isPublished;
    }

    // For authenticated users, chapters are gated by previous chapter completion
    if (chapter.chapterNumber === 1) {
      return chapter.isPublished;
    }

    // Check if previous chapter is completed
    const previousChapter = await this.chapterRepository.findOne({
      where: { chapterNumber: chapter.chapterNumber - 1 },
    });

    if (!previousChapter) {
      return false;
    }

    const previousProgress = await this.chapterProgressRepository.findOne({
      where: { userId, chapterId: previousChapter.id },
    });

    return !!previousProgress && previousProgress.status === 'completed';
  }

  /**
   * Mark chapter as completed
   */
  async markChapterCompleted(chapterId: string, userId: string) {
    let progress = await this.chapterProgressRepository.findOne({
      where: { userId, chapterId },
    });

    if (!progress) {
      progress = this.chapterProgressRepository.create({
        userId,
        chapterId,
      });
    }

    progress.status = 'completed';

    await this.chapterProgressRepository.save(progress);

    return {
      chapterId,
      status: 'completed',
    };
  }

  /**
   * Format chapter response
   */
  private formatChapter(chapter: Chapter, progress?: ChapterProgress | null) {
    return {
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      chapterNumber: chapter.chapterNumber,
      content: chapter.content,
      videoUrl: chapter.videoUrl,
      videoVimeoId: chapter.videoVimeoId,
      videoDurationSeconds: chapter.videoDurationSeconds,
      downloadUrl: chapter.downloadUrl,
      isPublished: chapter.isPublished,
      order: chapter.order,
      quizCount: chapter.quizzes?.length || 0,
      progress: progress
        ? {
            status: progress.status,
            videoWatched: progress.videoWatched,
            videoProgress: progress.videoProgress,
            quizPassed: progress.quizPassed,
            bestQuizScore: progress.bestQuizScore,
          }
        : null,
    };
  }
}

export const chapterService = new ChapterService();
