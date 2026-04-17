import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Enrollment, EnrollmentStatus } from '../models/Enrollment';
import { Chapter } from '../models/Chapter';
import { Quiz } from '../models/Quiz';
import { ChapterProgress, ProgressStatus } from '../models/ChapterProgress';
import { Payment, PaymentStatus } from '../models/Payment';
import { QuizAttempt } from '../models/QuizAttempt';
import { AppError } from '../middleware/errorHandler';

export class AdminService {
  private userRepository = AppDataSource.getRepository(User);
  private enrollmentRepository = AppDataSource.getRepository(Enrollment);
  private chapterRepository = AppDataSource.getRepository(Chapter);
  private quizRepository = AppDataSource.getRepository(Quiz);
  private progressRepository = AppDataSource.getRepository(ChapterProgress);
  private paymentRepository = AppDataSource.getRepository(Payment);
  private attemptRepository = AppDataSource.getRepository(QuizAttempt);

  /**
   * Get all enrolled students with their progress
   */
  async getStudents(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

     const [enrollments, total] = await this.enrollmentRepository.findAndCount({
       where: { status: EnrollmentStatus.ACTIVE },
       relations: ['student'],
       skip,
       take: limit,
       order: { createdAt: 'DESC' },
     });

    const studentDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progressData = await this.progressRepository.find({
          where: { userId: enrollment.studentId },
        });

        const completedChapters = progressData.filter((p) => p.status === ProgressStatus.COMPLETED).length;
        const passedQuizzes = progressData.filter((p) => p.quizPassed).length;
        const avgScore = this.calculateAverageScore(progressData);

        return {
          id: enrollment.student.id,
          name: enrollment.student.name,
          email: enrollment.student.email,
          createdAt: enrollment.student.createdAt,
          enrolledAt: enrollment.createdAt,
          isActive: enrollment.student.isActive,
          completedChapters,
          totalChapters: 13,
          completionPercentage: (completedChapters / 13) * 100,
          passedQuizzes,
          averageQuizScore: avgScore,
          status: enrollment.status,
        };
      })
    );

    return {
      students: studentDetails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single student details with full progress
   */
  async getStudentDetail(studentId: string) {
    const user = await this.userRepository.findOne({ where: { id: studentId } });

    if (!user) {
      throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
    }

    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, status: EnrollmentStatus.ACTIVE },
    });

    const progressData = await this.progressRepository.find({
      where: { userId: studentId },
      relations: ['chapter'],
      order: { chapterId: 'ASC' },
    });

    const attempts = await this.attemptRepository.find({
      where: { studentId },
    });

    const payments = await this.paymentRepository.find({
      where: { userId: studentId },
      order: { createdAt: 'DESC' },
    });

    const completedChapters = progressData.filter((p) => p.status === ProgressStatus.COMPLETED).length;
    const passedQuizzes = progressData.filter((p) => p.quizPassed).length;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
      enrolledAt: enrollment?.createdAt,
      status: enrollment?.status,
      enrollmentId: enrollment?.id,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        couponCode: p.couponCode || null,
        discountAmount: p.discountAmount || 0,
        stripePaymentIntentId: p.stripePaymentIntentId,
        completedAt: p.completedAt,
        createdAt: p.createdAt,
      })),
      // Flat shape — matches the list endpoint so the frontend can
      // use the same StudentSummary-style type for both.
      completedChapters,
      totalChapters: 13,
      completionPercentage: (completedChapters / 13) * 100,
      passedQuizzes,
      averageQuizScore: this.calculateAverageScoreFromAttempts(attempts),
      chapterProgress: progressData
        .map((p) => ({
          chapterId: p.chapterId,
          chapterNumber: p.chapter?.chapterNumber || 0,
          title: p.chapter?.title || '',
          status: p.status,
          videoWatched: p.videoWatched,
          videoProgress: p.videoProgress,
          quizPassed: p.quizPassed,
          bestQuizScore: p.bestQuizScore,
          updatedAt: p.updatedAt,
        }))
        .sort((a, b) => a.chapterNumber - b.chapterNumber),
    };
  }

  /**
   * Create new chapter
   */
  async createChapter(title: string, description: string, chapterNumber: number, videoVimeoId?: string) {
    if (!title || !description) {
      throw new AppError('Title and description are required', 400, 'VALIDATION_ERROR');
    }

    // Check if chapter number already exists
    const existingChapter = await this.chapterRepository.findOne({
      where: { chapterNumber },
    });

    if (existingChapter) {
      throw new AppError(`Chapter ${chapterNumber} already exists`, 400, 'DUPLICATE_CHAPTER');
    }

     const chapter = this.chapterRepository.create({
       title,
       description,
       chapterNumber,
       videoVimeoId,
       isPublished: true,
       content: '',
     });

    await this.chapterRepository.save(chapter);

     return {
       id: chapter.id,
       title: chapter.title,
       description: chapter.description,
       chapterNumber: chapter.chapterNumber,
       videoVimeoId: chapter.videoVimeoId,
       isPublished: chapter.isPublished,
       createdAt: chapter.createdAt,
     };
  }

  /**
   * Update chapter
   */
  async updateChapter(
    chapterId: string,
    title?: string,
    description?: string,
    content?: string,
    videoVimeoId?: string,
    videoDurationSeconds?: number
  ) {
    const chapter = await this.chapterRepository.findOne({ where: { id: chapterId } });

    if (!chapter) {
      throw new AppError('Chapter not found', 404, 'CHAPTER_NOT_FOUND');
    }

    if (title) chapter.title = title;
    if (description) chapter.description = description;
    if (content !== undefined) chapter.content = content;
    if (videoVimeoId) chapter.videoVimeoId = videoVimeoId;
    if (videoDurationSeconds) chapter.videoDurationSeconds = videoDurationSeconds;

    await this.chapterRepository.save(chapter);

    return {
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      videoVimeoId: chapter.videoVimeoId,
      videoDurationSeconds: chapter.videoDurationSeconds,
      updatedAt: chapter.updatedAt,
    };
  }

  /**
   * Get course analytics
   */
  async getAnalytics() {
    // Total students
    const totalStudents = await this.userRepository.count();

    // Enrolled students
    const enrolledStudents = await this.enrollmentRepository.count({
      where: { status: EnrollmentStatus.ACTIVE },
    });

    // Total revenue
    const completedPayments = await this.paymentRepository.find({
      where: { status: PaymentStatus.COMPLETED },
    });

    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    // Course completion stats
    const allProgress = await this.progressRepository.find();
    const allStudentIds = new Set(allProgress.map((p) => p.userId));

    const completedStudents = new Set();
    for (const studentId of allStudentIds) {
      const studentProgress = allProgress.filter((p) => p.userId === studentId);
      const allCompleted = studentProgress.every((p) => p.status === ProgressStatus.COMPLETED);
      if (allCompleted && studentProgress.length > 0) {
        completedStudents.add(studentId);
      }
    }

    // Quiz statistics
    const allAttempts = await this.attemptRepository.find();
    const passedAttempts = allAttempts.filter((a) => a.passed);
    const avgQuizScore = allAttempts.length > 0
      ? allAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / allAttempts.length
      : 0;

    // Chapter popularity
    const chapters = await this.chapterRepository.find();
    const chapterStats = await Promise.all(
      chapters.map(async (chapter) => {
        const progress = await this.progressRepository.count({
          where: { chapterId: chapter.id },
        });

        const quizzes = await this.quizRepository.count({
          where: { chapterId: chapter.id },
        });

        return {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          studentProgress: progress,
          quizzes,
        };
      })
    );

    return {
      overview: {
        totalStudents,
        enrolledStudents,
        completedStudents: completedStudents.size,
        completionRate: enrolledStudents > 0 ? (completedStudents.size / enrolledStudents) * 100 : 0,
        totalRevenue: (totalRevenue / 100).toFixed(2), // Convert cents to dollars
      },
      quizStatistics: {
        totalAttempts: allAttempts.length,
        passedAttempts: passedAttempts.length,
        failureRate: allAttempts.length > 0 ? ((allAttempts.length - passedAttempts.length) / allAttempts.length) * 100 : 0,
        averageScore: avgQuizScore.toFixed(2),
      },
      chapterEngagement: chapterStats,
    };
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics() {
    const payments = await this.paymentRepository.find();

    const completed = payments.filter((p) => p.status === PaymentStatus.COMPLETED);
    const failed = payments.filter((p) => p.status === PaymentStatus.FAILED);
    const pending = payments.filter((p) => p.status === PaymentStatus.PENDING);

    const totalRevenue = completed.reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = payments.filter((p) => p.status === PaymentStatus.REFUNDED).reduce((sum, p) => sum + p.amount, 0);

    return {
      summary: {
        totalTransactions: payments.length,
        completedTransactions: completed.length,
        failedTransactions: failed.length,
        pendingTransactions: pending.length,
        totalRevenue: (totalRevenue / 100).toFixed(2),
        totalRefunded: (totalRefunded / 100).toFixed(2),
        successRate: payments.length > 0 ? (completed.length / payments.length) * 100 : 0,
      },
      revenueByDate: this.groupPaymentsByDate(completed),
      topCoupons: this.getTopCoupons(payments),
    };
  }

  /**
   * Helper: Calculate average score from progress data
   */
  private calculateAverageScore(progressData: ChapterProgress[]): number {
    const scoresWithQuiz = progressData.filter((p) => p.bestQuizScore !== null && p.bestQuizScore > 0);
    if (scoresWithQuiz.length === 0) return 0;
    const sum = scoresWithQuiz.reduce((acc, p) => acc + (p.bestQuizScore || 0), 0);
    return parseFloat((sum / scoresWithQuiz.length).toFixed(2));
  }

  /**
   * Helper: Calculate average score from attempts
   */
  private calculateAverageScoreFromAttempts(attempts: QuizAttempt[]): number {
    if (attempts.length === 0) return 0;
    const sum = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
    return parseFloat((sum / attempts.length).toFixed(2));
  }

  /**
   * Helper: Group payments by date
   */
  private groupPaymentsByDate(payments: Payment[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    payments.forEach((p) => {
      const date = p.completedAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + p.amount;
    });

    return grouped;
  }

  /**
   * Helper: Get top coupons by usage
   */
  private getTopCoupons(payments: Payment[]): Record<string, number> {
    const coupons: Record<string, number> = {};

    payments
      .filter((p) => p.couponCode && p.status === PaymentStatus.COMPLETED)
      .forEach((p) => {
        if (p.couponCode) {
          coupons[p.couponCode] = (coupons[p.couponCode] || 0) + 1;
        }
      });

    return coupons;
  }
}

export const adminService = new AdminService();
