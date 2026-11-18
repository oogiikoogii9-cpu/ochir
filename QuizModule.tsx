import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/curriculum';
import { playSuccessChime, playWrenchClick } from '../utils/sound';

interface QuizModuleProps {
  bestScore: number | null;
  onSaveScore: (score: number, total: number) => void;
}

export const QuizModule: React.FC<QuizModuleProps> = ({
  bestScore,
  onSaveScore,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);

  const q = QUIZ_QUESTIONS[currentIndex];
  const selectedOption = answers[q.id];
  const answeredCount = Object.keys(answers).length;

  const correctCount = QUIZ_QUESTIONS.reduce(
    (acc, item) => (answers[item.id] === item.correctIndex ? acc + 1 : acc),
    0
  );

  const handleSelectOption = (idx: number) => {
    if (submitted) return;
    if (instantFeedback && answers[q.id] !== undefined) return;
    playWrenchClick(false);
    setAnswers((prev) => ({ ...prev, [q.id]: idx }));
  };

  const handleFinishQuiz = () => {
    setSubmitted(true);
    onSaveScore(correctCount, QUIZ_QUESTIONS.length);
    if (correctCount >= 8) {
      playSuccessChime(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);
  };

  // Topic breakdown for final scorecard
  const topics = Array.from(new Set(QUIZ_QUESTIONS.map((item) => item.topic)));
  const passed = correctCount >= 8;

  if (submitted) {
    const pct = Math.round((correctCount / QUIZ_QUESTIONS.length) * 100);
    return (
      <section aria-label="Сорилын үр дүн" className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="text-xs font-mono text-slate-500">
                Мэргэжлийн мастерын аттестатчилал · {QUIZ_QUESTIONS.length} асуулт
              </div>
              <h2 className="font-display text-3xl font-semibold text-slate-900">
                {passed ? 'Мастер зэрэглэлийн сорилд тэнцлээ' : 'Дахин давтах шаардлагатай'}
              </h2>
              <p className="text-sm text-slate-600">
                Тэнцэх босго: 80% буюу {Math.ceil(QUIZ_QUESTIONS.length * 0.8)} зөв хариулт.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-right">
              <div className="text-xs text-slate-500">Таны оноо</div>
              <div
                className={`font-mono text-3xl font-bold tabular-nums mt-0.5 ${
                  passed ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {correctCount} / {QUIZ_QUESTIONS.length} ({pct}%)
              </div>
            </div>
          </div>

          {/* Topic Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topics.map((topic) => {
              const items = QUIZ_QUESTIONS.filter((item) => item.topic === topic);
              const hits = items.filter((item) => answers[item.id] === item.correctIndex).length;
              return (
                <div key={topic} className="bg-slate-50 rounded-lg p-3.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">{topic}</span>
                  <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    {hits} / {items.length}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Review All Answers */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-semibold text-slate-900">Хариултын дэлгэрэнгүй шинжилгээ</h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {QUIZ_QUESTIONS.map((item, idx) => {
                const userChoice = answers[item.id];
                const isRight = userChoice === item.correctIndex;
                return (
                  <div key={item.id} className="p-4 bg-white space-y-2">
                    <div className="flex items-start gap-2.5">
                      {isRight ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-1" />
                      )}
                      <div className="space-y-1 flex-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {idx + 1}. {item.question}
                        </div>
                        <div className="text-xs text-slate-600">
                          Зөв хариулт:{' '}
                          <span className="font-semibold text-emerald-800">
                            {item.options[item.correctIndex]}
                          </span>
                          {!isRight && userChoice !== undefined && (
                            <span className="text-red-700 ml-3">
                              Таны сонголт: {item.options[userChoice]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed pt-1">
                          {item.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Award className="w-4 h-4 text-amber-600" />
              <span>
                Дээд амжилт:{' '}
                <strong className="font-mono text-slate-900 tabular-nums">
                  {bestScore ?? correctCount} / {QUIZ_QUESTIONS.length}
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Сорил дахин өгөх</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  const showAnswerExplanation = instantFeedback && selectedOption !== undefined;

  return (
    <section aria-label="Мэргэжлийн сорил" className="max-w-4xl mx-auto space-y-6">
      {/* Top Question Navigator & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {QUIZ_QUESTIONS.map((item, idx) => {
            const isCurr = idx === currentIndex;
            const ans = answers[item.id];
            const answered = ans !== undefined;
            const right = ans === item.correctIndex;
            let btnClass = 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
            if (isCurr) {
              btnClass = 'bg-slate-900 text-white border-slate-900 font-semibold';
            } else if (answered && instantFeedback) {
              btnClass = right
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200';
            } else if (answered) {
              btnClass = 'bg-sky-50 text-sky-800 border-sky-200';
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Асуулт ${idx + 1}`}
                className={`w-9 h-9 rounded-lg border text-xs font-mono tabular-nums transition-colors ${btnClass}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={instantFeedback}
            onChange={(e) => setInstantFeedback(e.target.checked)}
            className="w-4 h-4 accent-sky-600"
          />
          <span>Шууд тайлбар харах</span>
        </label>
      </div>

      {/* Question Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-semibold text-sky-700 tabular-nums">
              Асуулт {currentIndex + 1} / {QUIZ_QUESTIONS.length}
            </span>
            <span aria-hidden="true">·</span>
            <span>{q.topic}</span>
            {bestScore !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Дээд оноо: {bestScore}/{QUIZ_QUESTIONS.length}
                </span>
              </>
            )}
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 leading-snug">
            {q.question}
          </h2>

          {q.contextSpec && (
            <div className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 inline-block">
              {q.contextSpec}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === q.correctIndex;
            let stateClasses = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-800';

            if (showAnswerExplanation) {
              if (isCorrect) {
                stateClasses = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
              } else if (isSelected) {
                stateClasses = 'border-red-400 bg-red-50/70 text-red-950';
              } else {
                stateClasses = 'border-slate-200 bg-white text-slate-400';
              }
            } else if (isSelected) {
              stateClasses = 'border-sky-600 bg-sky-50/70 text-slate-900 font-medium';
            }

            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors flex items-center justify-between gap-4 ${stateClasses}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono flex items-center justify-center shrink-0 text-slate-700">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm leading-snug">{opt}</span>
                </div>

                {showAnswerExplanation && isCorrect && (
                  <span className="text-xs font-medium text-emerald-700 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-4 h-4" /> Зөв
                  </span>
                )}
                {showAnswerExplanation && isSelected && !isCorrect && (
                  <span className="text-xs font-medium text-red-700 flex items-center gap-1 shrink-0">
                    <XCircle className="w-4 h-4" /> Буруу
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Instant Explanation Box */}
        {showAnswerExplanation && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-900 mr-1.5">Инженерийн тайлбар:</span>
            {q.explanation}
          </div>
        )}

        {/* Navigation Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Өмнөх</span>
          </button>

          <div className="flex items-center gap-3">
            {currentIndex < QUIZ_QUESTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(QUIZ_QUESTIONS.length - 1, i + 1))}
                className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <span>Дараагийн асуулт</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishQuiz}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
              >
                Сорил дуусгаж дүн харах ({answeredCount}/{QUIZ_QUESTIONS.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
