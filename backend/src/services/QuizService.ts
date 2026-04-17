import { AppDataSource } from '../config/database';
import { Quiz } from '../models/Quiz';
import { Question } from '../models/Question';
import { QuestionOption } from '../models/QuestionOption';
import { QuizAttempt, AttemptStatus } from '../models/QuizAttempt';
import { QuizAnswer } from '../models/QuizAnswer';
import { ChapterProgress, ProgressStatus } from '../models/ChapterProgress';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { calculateQuizScore, isQuizPassed } from '../utils/helpers';
import { emailService } from './EmailService';

export class QuizService {
  private quizRepository = AppDataSource.getRepository(Quiz);
  private questionRepository = AppDataSource.getRepository(Question);
  private optionRepository = AppDataSource.getRepository(QuestionOption);
  private attemptRepository = AppDataSource.getRepository(QuizAttempt);
  private answerRepository = AppDataSource.getRepository(QuizAnswer);
  private chapterProgressRepository = AppDataSource.getRepository(ChapterProgress);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Get quiz questions for student (shuffled if enabled)
   */
  async getQuizQuestions(quizId: string, userId: string) {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['questions', 'questions.options'],
    });

    if (!quiz) {
      throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
    }

    // Check attempt count for retake limit
    const attempts = await this.attemptRepository.find({
      where: { studentId: userId, quizId },
    });

    if (attempts.length > 0) {
      const lastAttempt = attempts[attempts.length - 1];
      const passedAttempts = attempts.filter((a) => a.passed).length;

      if (passedAttempts > 0 && !quiz.allowRetakes) {
        throw new AppError('Quiz already passed and retakes are not allowed', 403, 'QUIZ_PASSED');
      }

      if (attempts.length >= quiz.maxRetakes && quiz.maxRetakes > 0) {
        throw new AppError(`Maximum ${quiz.maxRetakes} attempts reached`, 403, 'MAX_ATTEMPTS_EXCEEDED');
      }
    }

    // Create new attempt
    const attempt = this.attemptRepository.create({
      studentId: userId,
      quizId,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
      questionsAnswered: 0,
    });

    await this.attemptRepository.save(attempt);

    // Prepare questions
    let questions = quiz.questions || [];

    if (quiz.shuffleQuestions) {
      questions = this.shuffleArray(questions);
    }

    const formattedQuestions = questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      type: question.type,
      points: question.points,
      options: (question.options || []).map((option) => ({
        id: option.id,
        optionText: option.optionText,
      })),
    }));

    return {
      attemptId: attempt.id,
      quizId,
      quizTitle: quiz.title,
      totalQuestions: quiz.totalQuestions,
      timeLimit: quiz.timeLimit,
      questions: formattedQuestions,
      startedAt: attempt.startedAt,
    };
  }

  /**
   * Submit quiz answers and grade immediately
   */
  async submitQuiz(quizId: string, userId: string, attemptId: string, answers: any[]) {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId: userId, quizId },
      relations: ['quiz'],
    });

    if (!attempt) {
      throw new AppError('Quiz attempt not found', 404, 'ATTEMPT_NOT_FOUND');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new AppError('Quiz attempt is not in progress', 400, 'INVALID_ATTEMPT_STATUS');
    }

    // Get quiz with all questions and options
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['questions', 'questions.options'],
    });

    if (!quiz) {
      throw new AppError('Quiz not found', 404, 'QUIZ_NOT_FOUND');
    }

    // Grade the quiz
    const gradeResult = await this.gradeQuiz(quiz, answers, attempt);

    return gradeResult;
  }

  /**
   * Internal method to grade quiz
   */
  private async gradeQuiz(quiz: Quiz, answers: any[], attempt: QuizAttempt) {
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    // Process each answer
    for (const submittedAnswer of answers) {
      const question = quiz.questions?.find((q) => q.id === submittedAnswer.questionId);

      if (!question) {
        continue;
      }

      totalPoints += question.points;

      let isCorrect = false;

      if (submittedAnswer.selectedOptionId) {
        const selectedOption = question.options?.find((o) => o.id === submittedAnswer.selectedOptionId);
        isCorrect = selectedOption?.isCorrect || false;
      }

      if (isCorrect) {
        correctAnswers++;
        earnedPoints += question.points;
      }

      // Save answer
      const answer = this.answerRepository.create({
        attemptId: attempt.id,
        questionId: submittedAnswer.questionId,
        selectedOptionId: submittedAnswer.selectedOptionId,
        answerText: submittedAnswer.answerText,
        isCorrect,
        earnedPoints: isCorrect ? question.points : 0,
      });

      await this.answerRepository.save(answer);
    }

    // Calculate score
    const score = calculateQuizScore(correctAnswers, quiz.totalQuestions);
    const passed = isQuizPassed(score, quiz.passingScore);
    const timeSpentSeconds = Math.round(
      (new Date().getTime() - attempt.startedAt!.getTime()) / 1000
    );

    // Update attempt
    attempt.status = AttemptStatus.GRADED;
    attempt.score = score;
    attempt.passed = passed;
    attempt.questionsAnswered = answers.length;
    attempt.completedAt = new Date();
    attempt.timeSpentSeconds = timeSpentSeconds;

    await this.attemptRepository.save(attempt);

    // Update chapter progress if quiz passed
    if (passed) {
      await this.updateChapterProgressOnPass(quiz.chapterId, attempt.studentId, score);
    }

    // Fire-and-forget quiz result email. Tier is picked inside the
    // EmailService based on score (< passingScore, passingScore..79, 80+).
    // Wrapped so a mail-delivery failure never breaks the grade response.
    this.sendQuizResultEmailFireAndForget(
      attempt.studentId,
      quiz.chapterId,
      quiz.chapter?.title || 'your quiz',
      score,
      quiz.passingScore
    );

    return {
      attemptId: attempt.id,
      score,
      passed,
      correctAnswers,
      totalQuestions: quiz.totalQuestions,
      passingScore: quiz.passingScore,
      timeSpentSeconds,
      earnedPoints,
      totalPoints,
      showCorrectAnswers: quiz.showCorrectAnswers,
    };
  }

  /**
   * Fire-and-forget helper for the quiz result email. Loads the student
   * so we have their email + first name, then delegates to EmailService
   * which picks the right template based on score. Any failure is logged
   * and swallowed — email delivery must never break the grade response.
   */
  private sendQuizResultEmailFireAndForget(
    userId: string,
    chapterId: string,
    chapterTitle: string,
    score: number,
    passingScore: number
  ): void {
    (async () => {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) return;
      await emailService.sendQuizResultEmail(
        user.email,
        user.firstName,
        chapterTitle,
        chapterId,
        score,
        passingScore
      );
    })().catch((err) => {
      console.error('Quiz result email failed:', err);
    });
  }

  /**
   * Update chapter progress when quiz is passed
   */
  private async updateChapterProgressOnPass(chapterId: string, userId: string, score: number) {
    let progress = await this.chapterProgressRepository.findOne({
      where: { userId, chapterId },
    });

    if (!progress) {
      progress = this.chapterProgressRepository.create({
        userId,
        chapterId,
      });
    }

    progress.quizPassed = true;
    progress.bestQuizScore = Math.max(progress.bestQuizScore || 0, score);
    progress.quizPassedAt = new Date();

    // Mark as completed if video was also watched
    if (progress.videoWatched) {
      progress.status = ProgressStatus.COMPLETED;
    }

    await this.chapterProgressRepository.save(progress);
  }

  /**
   * Get attempt history for a quiz
   */
  async getAttemptHistory(quizId: string, userId: string) {
    const attempts = await this.attemptRepository.find({
      where: { quizId, studentId: userId },
      order: { createdAt: 'DESC' },
    });

    return {
      quizId,
      totalAttempts: attempts.length,
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        passed: attempt.passed,
        questionsAnswered: attempt.questionsAnswered,
        timeSpentSeconds: attempt.timeSpentSeconds,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      })),
    };
  }

  /**
   * Get detailed attempt results
   */
  async getAttemptResults(attemptId: string, userId: string) {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId: userId },
      relations: ['quiz'],
    });

    if (!attempt) {
      throw new AppError('Attempt not found', 404, 'ATTEMPT_NOT_FOUND');
    }

    const answers = await this.answerRepository.find({
      where: { attemptId },
      relations: ['question', 'question.options'],
    });

    const detailedAnswers = answers.map((answer) => ({
      questionId: answer.questionId,
      questionText: answer.question.questionText,
      selectedOptionId: answer.selectedOptionId,
      answerText: answer.answerText,
      isCorrect: answer.isCorrect,
      earnedPoints: answer.earnedPoints,
      correctOption: attempt.quiz?.showCorrectAnswers
        ? answer.question.options?.find((o) => o.isCorrect)
        : null,
      explanation: attempt.quiz?.showCorrectAnswers ? answer.question.explanation : null,
    }));

    return {
      attemptId,
      quizId: attempt.quizId,
      score: attempt.score,
      passed: attempt.passed,
      totalQuestions: attempt.quiz.totalQuestions,
      questionsAnswered: attempt.questionsAnswered,
      passingScore: attempt.quiz.passingScore,
      timeSpentSeconds: attempt.timeSpentSeconds,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      answers: detailedAnswers,
    };
  }

  /**
   * Utility: Shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const quizService = new QuizService();
