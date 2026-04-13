import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  quizzesApi,
  type QuizMeta,
  type QuizStart,
  type QuizResult,
  type AttemptResults,
  type SubmitAnswer,
} from '../api/quizzes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as {
      response?: { data?: { message?: string; error?: string } };
      message?: string;
    };
    return e.response?.data?.message || e.response?.data?.error || e.message || fallback;
  }
  return fallback;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'intro'; quiz: QuizMeta }
  | { kind: 'taking'; quiz: QuizStart; selected: Map<string, string> }
  | { kind: 'submitting' }
  | { kind: 'results'; result: QuizResult; quiz: QuizStart }
  | { kind: 'review'; result: QuizResult; details: AttemptResults; quiz: QuizStart };

function QuizPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });

  // Load quiz metadata for this chapter
  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;

    quizzesApi
      .getChapterQuizzes(chapterId)
      .then((quizzes) => {
        if (cancelled) return;
        if (quizzes.length === 0) {
          setPhase({ kind: 'error', message: 'No quizzes found for this chapter.' });
          return;
        }
        setPhase({ kind: 'intro', quiz: quizzes[0] });
      })
      .catch((err) => {
        if (cancelled) return;
        setPhase({ kind: 'error', message: extractError(err, 'Failed to load quiz.') });
      });

    return () => { cancelled = true; };
  }, [chapterId]);

  // Start quiz — fetch questions
  const handleStart = useCallback(async (quizId: string) => {
    setPhase({ kind: 'loading' });
    try {
      const quiz = await quizzesApi.startQuiz(quizId);
      setPhase({ kind: 'taking', quiz, selected: new Map() });
    } catch (err) {
      setPhase({ kind: 'error', message: extractError(err, 'Could not start quiz.') });
    }
  }, []);

  // Submit answers
  const handleSubmit = useCallback(async (quiz: QuizStart, selected: Map<string, string>) => {
    setPhase({ kind: 'submitting' });
    const answers: SubmitAnswer[] = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: selected.get(q.id) || '',
    }));

    try {
      const result = await quizzesApi.submitQuiz(quiz.quizId, quiz.attemptId, answers);
      setPhase({ kind: 'results', result, quiz });
    } catch (err) {
      setPhase({ kind: 'error', message: extractError(err, 'Failed to submit quiz.') });
    }
  }, []);

  // Load detailed review
  const handleViewReview = useCallback(async (result: QuizResult, quiz: QuizStart) => {
    setPhase({ kind: 'loading' });
    try {
      const details = await quizzesApi.getAttemptResults(result.attemptId);
      setPhase({ kind: 'review', result, details, quiz });
    } catch (err) {
      setPhase({ kind: 'error', message: extractError(err, 'Failed to load review.') });
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link to={`/chapters/${chapterId}`} className="text-sm text-slate-500 hover:text-brand">
          &larr; Back to chapter
        </Link>
      </div>

      {phase.kind === 'loading' && (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">Loading&hellip;</div>
      )}

      {phase.kind === 'error' && (
        <div className="rounded border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-900">Something went wrong.</p>
          <p className="mt-1 text-sm text-red-700">{phase.message}</p>
          <Link to={`/chapters/${chapterId}`} className="mt-3 inline-block text-sm text-brand hover:underline">
            Back to chapter
          </Link>
        </div>
      )}

      {phase.kind === 'intro' && (
        <IntroPhase quiz={phase.quiz} onStart={handleStart} />
      )}

      {phase.kind === 'taking' && (
        <TakingPhase quiz={phase.quiz} selected={phase.selected} onSubmit={handleSubmit} />
      )}

      {phase.kind === 'submitting' && (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-500">
          Submitting your answers&hellip;
        </div>
      )}

      {phase.kind === 'results' && (
        <ResultsPhase
          result={phase.result}
          chapterId={chapterId!}
          onViewReview={(r) => handleViewReview(r, phase.quiz)}
          onRetake={() => handleStart(phase.quiz.quizId)}
        />
      )}

      {phase.kind === 'review' && (
        <ReviewPhase result={phase.result} details={phase.details} quiz={phase.quiz} chapterId={chapterId!} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 1: Intro
// ---------------------------------------------------------------------------

function IntroPhase({ quiz, onStart }: { quiz: QuizMeta; onStart: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
      <h1 className="text-2xl font-semibold text-slate-900">{quiz.title}</h1>
      {quiz.description && (
        <p className="mt-2 text-slate-600">{quiz.description}</p>
      )}

      <div className="mt-6 flex justify-center gap-6 text-sm text-slate-500">
        <div>
          <span className="block text-2xl font-semibold text-slate-900">{quiz.totalQuestions}</span>
          questions
        </div>
        <div>
          <span className="block text-2xl font-semibold text-slate-900">{quiz.passingScore}%</span>
          to pass
        </div>
        {quiz.timeLimit && (
          <div>
            <span className="block text-2xl font-semibold text-slate-900">{quiz.timeLimit}</span>
            min limit
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onStart(quiz.id)}
        className="mt-8 rounded-md bg-brand px-6 py-3 text-sm font-medium text-white shadow transition hover:bg-brand-light"
      >
        Start quiz
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 2: Taking quiz
// ---------------------------------------------------------------------------

function TakingPhase({
  quiz,
  selected: initialSelected,
  onSubmit,
}: {
  quiz: QuizStart;
  selected: Map<string, string>;
  onSubmit: (quiz: QuizStart, selected: Map<string, string>) => void;
}) {
  const [selected, setSelected] = useState<Map<string, string>>(initialSelected);
  const [timeLeft, setTimeLeft] = useState<number | null>(
    quiz.timeLimit ? quiz.timeLimit * 60 : null
  );

  const answeredCount = selected.size;
  const allAnswered = answeredCount === quiz.questions.length;

  // Timer
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      onSubmit(quiz, selected);
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearInterval(id);
  }, [timeLeft, quiz, selected, onSubmit]);

  const handleSelect = (questionId: string, optionId: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(questionId, optionId);
      return next;
    });
  };

  return (
    <div>
      {/* Sticky header with progress + timer */}
      <div className="sticky top-0 z-10 -mx-6 mb-6 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            {answeredCount} / {quiz.questions.length} answered
          </span>
          {timeLeft !== null && (
            <span className={`text-sm font-mono font-medium ${timeLeft < 60 ? 'text-red-600' : 'text-slate-600'}`}>
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(answeredCount / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {quiz.questions.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">
              Question {idx + 1}
            </p>
            <p className="text-sm font-medium text-slate-900 mb-4">{q.questionText}</p>

            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = selected.get(q.id) === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                      isSelected
                        ? 'border-brand bg-brand/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={isSelected}
                      onChange={() => handleSelect(q.id, opt.id)}
                      className="mt-0.5 accent-brand"
                    />
                    <span className="text-sm text-slate-700">{opt.optionText}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="mt-8 text-center">
        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => onSubmit(quiz, selected)}
          className="rounded-md bg-brand px-6 py-3 text-sm font-medium text-white shadow transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit quiz
        </button>
        {!allAnswered && (
          <p className="mt-2 text-xs text-slate-500">
            Answer all {quiz.questions.length} questions to submit.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 3: Results
// ---------------------------------------------------------------------------

function ResultsPhase({
  result,
  chapterId,
  onViewReview,
  onRetake,
}: {
  result: QuizResult;
  chapterId: string;
  onViewReview: (result: QuizResult) => void;
  onRetake: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
      {/* Score circle */}
      <div
        className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full text-3xl font-bold ${
          result.passed
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-red-50 text-red-700'
        }`}
      >
        {Math.round(result.score)}%
      </div>

      <div className="mt-4">
        {result.passed ? (
          <>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              Passed
            </span>
            <p className="mt-2 text-slate-600">Great work! You passed this quiz.</p>
          </>
        ) : (
          <>
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
              Not passed
            </span>
            <p className="mt-2 text-slate-600">
              You need {result.passingScore}% to pass. Review the material and try again.
            </p>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 flex justify-center gap-6 text-sm text-slate-500">
        <div>
          <span className="block text-lg font-semibold text-slate-900">
            {result.correctAnswers}/{result.totalQuestions}
          </span>
          correct
        </div>
        <div>
          <span className="block text-lg font-semibold text-slate-900">
            {result.passingScore}%
          </span>
          needed
        </div>
        <div>
          <span className="block text-lg font-semibold text-slate-900">
            {formatTime(result.timeSpentSeconds)}
          </span>
          time
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to={`/chapters/${chapterId}`}
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand"
        >
          Back to chapter
        </Link>

        {result.showCorrectAnswers && (
          <button
            type="button"
            onClick={() => onViewReview(result)}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand"
          >
            Review answers
          </button>
        )}

        {!result.passed && (
          <button
            type="button"
            onClick={onRetake}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-light"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 4: Answer review
// ---------------------------------------------------------------------------

function ReviewPhase({
  result,
  details,
  quiz,
  chapterId,
}: {
  result: QuizResult;
  details: AttemptResults;
  quiz: QuizStart;
  chapterId: string;
}) {
  // Build a lookup: optionId → optionText from the quiz questions
  const optionTextMap = new Map<string, string>();
  for (const q of quiz.questions) {
    for (const opt of q.options) {
      optionTextMap.set(opt.id, opt.optionText);
    }
  }
  return (
    <div>
      {/* Summary bar */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Answer Review — {Math.round(result.score)}%
          {result.passed ? (
            <span className="ml-2 text-sm font-medium text-emerald-600">Passed</span>
          ) : (
            <span className="ml-2 text-sm font-medium text-red-600">Not passed</span>
          )}
        </h1>
        <Link
          to={`/chapters/${chapterId}`}
          className="text-sm text-slate-500 hover:text-brand"
        >
          Back to chapter
        </Link>
      </div>

      {/* Per-question review */}
      <div className="space-y-4">
        {details.answers.map((ans, idx) => (
          <div
            key={ans.questionId}
            className={`rounded-lg border p-5 shadow-sm ${
              ans.isCorrect
                ? 'border-emerald-200 bg-emerald-50/30'
                : 'border-red-200 bg-red-50/30'
            }`}
          >
            <div className="flex items-start gap-2 mb-3">
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold text-white ${
                  ans.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              >
                {idx + 1}
              </span>
              <p className="text-sm font-medium text-slate-900">{ans.questionText}</p>
            </div>

            {/* Student's answer */}
            {ans.selectedOptionId && (
              <p className="ml-8 text-sm text-slate-600">
                <span className="font-medium">Your answer:</span>{' '}
                {optionTextMap.get(ans.selectedOptionId) || ans.answerText || 'No answer'}
                {ans.isCorrect ? (
                  <span className="ml-1 text-emerald-600 font-medium"> — Correct</span>
                ) : (
                  <span className="ml-1 text-red-600 font-medium"> — Incorrect</span>
                )}
              </p>
            )}

            {/* Correct answer (if wrong and review enabled) */}
            {!ans.isCorrect && ans.correctOption && (
              <p className="ml-8 mt-1 text-sm text-emerald-700">
                <span className="font-medium">Correct answer:</span> {ans.correctOption.optionText}
              </p>
            )}

            {/* Explanation */}
            {ans.explanation && (
              <p className="ml-8 mt-2 text-xs text-slate-500 leading-relaxed">
                {ans.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="mt-8 text-center">
        <Link
          to={`/chapters/${chapterId}`}
          className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-light"
        >
          Back to chapter
        </Link>
      </div>
    </div>
  );
}

export default QuizPage;
