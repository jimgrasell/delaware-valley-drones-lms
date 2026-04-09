import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Enrollment, EnrollmentStatus } from '../models/Enrollment';
import { ChapterProgress, ProgressStatus } from '../models/ChapterProgress';
import { Chapter } from '../models/Chapter';
import { QuizAttempt, AttemptStatus } from '../models/QuizAttempt';
import { Certificate } from '../models/Certificate';
import { AppError } from '../middleware/errorHandler';
import { formatProgress } from '../utils/helpers';

export class StudentService {
  private userRepository = AppDataSource.getRepository(User);
  private enrollmentRepository = AppDataSource.getRepository(Enrollment);
  private chapterProgressRepository = AppDataSource.getRepository(ChapterProgress);
  private chapterRepository = AppDataSource.getRepository(Chapter);
  private quizAttemptRepository = AppDataSource.getRepository(QuizAttempt);
  private certificateRepository = AppDataSource.getRepository(Certificate);

  /**
   * Get student dashboard with overall progress
   */
  async getDashboard(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { studentId: userId },
      relations: ['student'],
    });

    if (enrollments.length === 0) {
      return {
        user: user.toJSON(),
        enrollments: [],
        activeEnrollment: null,
        totalProgress: 0,
        completedChapters: 0,
        totalChapters: 0,
        certificateIssued: false,
      };
    }

    // Get the most recent active enrollment
    const activeEnrollment = enrollments.find((e) => e.status === 'active') || enrollments[0];

    const chapters = await this.chapterRepository.find();
    const totalChapters = chapters.length;

    const chapterProgress = await this.chapterProgressRepository.find({
      where: { userId },
    });

    const completedChapters = chapterProgress.filter((cp) => cp.status === 'completed').length;
    const totalProgress = formatProgress(completedChapters, totalChapters);

    const certificate = await this.certificateRepository.findOne({
      where: { userId },
    });

    return {
      user: user.toJSON(),
      enrollments: enrollments.map((e) => ({
        id: e.id,
        status: e.status,
        progress: e.progress,
        completedChapters: e.completedChapters,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      activeEnrollment: {
        id: activeEnrollment.id,
        status: activeEnrollment.status,
        progress: activeEnrollment.progress,
        completedChapters: activeEnrollment.completedChapters,
      },
      totalProgress,
      completedChapters,
      totalChapters,
      certificateIssued: !!certificate,
      certificateId: certificate?.id,
    };
  }

  /**
   * Get detailed progress for each chapter
   */
  async getProgress(userId: string) {
    const chapters = await this.chapterRepository.find({
      order: { order: 'ASC' },
    });

    const chapterProgress = await this.chapterProgressRepository.find({
      where: { userId },
      relations: ['chapter'],
    });

    const totalChapters = chapters.length;
    const completedChapters = chapterProgress.filter((cp) => cp.status === 'completed').length;

    const progressDetails = chapters.map((chapter) => {
      const progress = chapterProgress.find((cp) => cp.chapterId === chapter.id);

      return {
        chapterId: chapter.id,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        status: progress?.status || 'not_started',
        videoWatched: progress?.videoWatched || false,
        videoProgress: progress?.videoProgress || 0,
        quizPassed: progress?.quizPassed || false,
        bestQuizScore: progress?.bestQuizScore || 0,
        completedAt: progress?.updatedAt,
      };
    });

    return {
      userId,
      totalChapters,
      completedChapters,
      overallProgress: formatProgress(completedChapters, totalChapters),
      chapters: progressDetails,
    };
  }

  /**
   * Get student gradebook (quiz scores)
   */
  async getGradebook(userId: string) {
    const quizAttempts = await this.quizAttemptRepository.find({
      where: { studentId: userId, status: AttemptStatus.GRADED },
      relations: ['quiz', 'quiz.chapter'],
      order: { createdAt: 'DESC' },
    });

    const gradebook = quizAttempts.map((attempt) => ({
      attemptId: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.title,
      chapterNumber: attempt.quiz.chapter.chapterNumber,
      chapterTitle: attempt.quiz.chapter.title,
      score: attempt.score,
      passed: attempt.passed,
      questionsAnswered: attempt.questionsAnswered,
      totalQuestions: attempt.quiz.totalQuestions,
      passingScore: attempt.quiz.passingScore,
      attemptedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      timeSpentSeconds: attempt.timeSpentSeconds,
    }));

    // Calculate statistics
    const totalAttempts = gradebook.length;
    const passedAttempts = gradebook.filter((g) => g.passed).length;
    const avgScore = gradebook.length > 0 ? Math.round(gradebook.reduce((sum, g) => sum + (g.score || 0), 0) / gradebook.length) : 0;
    const highestScore = gradebook.length > 0 ? Math.max(...gradebook.map((g) => g.score || 0)) : 0;

    return {
      userId,
      statistics: {
        totalAttempts,
        passedAttempts,
        passingRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
        averageScore: avgScore,
        highestScore,
      },
      gradebook,
    };
  }

  /**
   * Get student profile
   */
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user.toJSON();
  }

  /**
   * Update student profile
   */
  async updateProfile(userId: string, updates: Partial<User>) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Only allow updating specific fields
    const allowedFields = ['firstName', 'lastName', 'phone', 'bio', 'profilePhotoUrl'];
    allowedFields.forEach((field) => {
      if (field in updates) {
        (user as any)[field] = (updates as any)[field];
      }
    });

    await this.userRepository.save(user);
    return user.toJSON();
  }

  /**
   * Get student's active enrollment
   */
  async getActiveEnrollment(userId: string) {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId: userId, status: EnrollmentStatus.ACTIVE },
    });

    if (!enrollment) {
      throw new AppError('No active enrollment found', 404, 'NO_ENROLLMENT');
    }

    return enrollment;
  }

  /**
   * Get certificate details
   */
  async getCertificate(userId: string) {
    const certificate = await this.certificateRepository.findOne({
      where: { userId },
    });

    if (!certificate) {
      throw new AppError('Certificate not found', 404, 'NO_CERTIFICATE');
    }

    return {
      id: certificate.id,
      verificationId: certificate.verificationId,
      finalScore: certificate.finalScore,
      certificateUrl: certificate.certificateUrl,
      completionDate: certificate.completionDate,
      createdAt: certificate.createdAt,
    };
  }
}

export const studentService = new StudentService();
