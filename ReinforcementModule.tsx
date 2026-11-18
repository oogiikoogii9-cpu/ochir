import React, { useMemo, useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  Stethoscope,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  REINFORCEMENT_FAULTS,
  REINFORCEMENT_FLASHCARDS,
  REINFORCEMENT_SEQUENCES,
} from '../data/curriculum';
import { playLeakAlert, playSuccessChime, playWrenchClick } from '../utils/sound';

type DrillMode = 'sequence' | 'faults' | 'flashcards';

interface ReinforcementModuleProps {
  masteredFlashcardIds: string[];
  completedDrillIds: string[];
  onToggleFlashcard: (id: string) => void;
  onCompleteDrill: (id: string) => void;
}

function deterministicShuffle(items: string[], seedOffset = 1): string[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (i * 3 + seedOffset) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure shuffled array isn't already identical to correct order
  if (arr.every((v, idx) => v === items[idx]) && arr.length > 1) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

export const ReinforcementModule: React.FC<ReinforcementModuleProps> = ({
  masteredFlashcardIds,
  completedDrillIds,
  onToggleFlashcard,
  onCompleteDrill,
}) => {
  const [mode, setMode] = useState<DrillMode>('sequence');

  // 1. Sequence Builder State
  const [seqIdx, setSeqIdx] = useState<number>(0);
  const activeSeq = REINFORCEMENT_SEQUENCES[seqIdx];
  const [userOrder, setUserOrder] = useState<string[]>(() =>
    deterministicShuffle(REINFORCEMENT_SEQUENCES[0].correctSteps, 2)
  );
  const [seqChecked, setSeqChecked] = useState<boolean>(false);

  // 2. Fault Diagnosis State
  const [faultIdx, setFaultIdx] = useState<number>(0);
  const [pickedCause, setPickedCause] = useState<number | null>(null);
  const [pickedFix, setPickedFix] = useState<number | null>(null);
  const [faultChecked, setFaultChecked] = useState<boolean>(false);

  // 3. Flashcards State
  const [cardIdx, setCardIdx] = useState<number>(0);
  const [cardFlipped, setCardFlipped] = useState<boolean>(false);

  const selectSequence = (idx: number) => {
    setSeqIdx(idx);
    setUserOrder(deterministicShuffle(REINFORCEMENT_SEQUENCES[idx].correctSteps, idx + 2));
    setSeqChecked(false);
  };

  const moveStep = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= userOrder.length) return;
    playWrenchClick(false);
    setSeqChecked(false);
    setUserOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const seqMatches = useMemo(
    () =>
      userOrder.map((step, i) => step === activeSeq.correctSteps[i]),
    [userOrder, activeSeq]
  );
  const seqAllCorrect = seqMatches.every(Boolean);

  const handleCheckSequence = () => {
    setSeqChecked(true);
    if (seqAllCorrect) {
      playSuccessChime(false);
      onCompleteDrill(activeSeq.id);
    } else {
      playLeakAlert(false);
    }
  };

  const activeFault = REINFORCEMENT_FAULTS[faultIdx];
  const faultBothCorrect =
    pickedCause === activeFault.correctCauseIndex &&
    pickedFix === activeFault.correctFixIndex;

  const handleCheckFault = () => {
    if (pickedCause === null || pickedFix === null) return;
    setFaultChecked(true);
    if (faultBothCorrect) {
      playSuccessChime(false);
      onCompleteDrill(activeFault.id);
    } else {
      playLeakAlert(false);
    }
  };

  const selectFault = (idx: number) => {
    setFaultIdx(idx);
    setPickedCause(null);
    setPickedFix(null);
    setFaultChecked(false);
  };

  const activeCard = REINFORCEMENT_FLASHCARDS[cardIdx];
  const isCardMastered = masteredFlashcardIds.includes(activeCard.id);

  return (
    <section aria-label="Бататгал дадлага" className="space-y-6">
      {/* Drill Mode Switcher + Summary Tally */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('sequence')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md flex items-center gap-2 transition-colors whitespace-nowrap ${
              mode === 'sequence'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>1. Ажлын дараалал угсрах</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('faults')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md flex items-center gap-2 transition-colors whitespace-nowrap ${
              mode === 'faults'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4 shrink-0" />
            <span>2. Гэмтэл оношлох</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('flashcards')}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md flex items-center gap-2 transition-colors whitespace-nowrap ${
              mode === 'flashcards'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>3. Норм цээжлэх карт</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 font-mono tabular-nums">
          <span>
            Дадлага: {completedDrillIds.length} /{' '}
            {REINFORCEMENT_SEQUENCES.length + REINFORCEMENT_FAULTS.length}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Тогтоосон карт: {masteredFlashcardIds.length} / {REINFORCEMENT_FLASHCARDS.length}
          </span>
        </div>
      </div>

      {/* Mode 1: Execution Sequence Builder */}
      {mode === 'sequence' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Технологийн дараалал
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Мастер сантехникчийн гүйцэтгэлийн алхмуудыг эхнээс нь дуустал зөв эрэмбэнд оруулж бататгана уу.
            </p>
            <div className="space-y-2 pt-2">
              {REINFORCEMENT_SEQUENCES.map((item, idx) => {
                const done = completedDrillIds.includes(item.id);
                const active = idx === seqIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectSequence(idx)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-start gap-2.5 ${
                      active
                        ? 'border-sky-600 bg-sky-50/70'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        done ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <div>
                      <div className="text-[11px] font-mono text-slate-500">{item.standard}</div>
                      <div className="text-sm font-semibold text-slate-900 leading-snug">
                        {item.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="space-y-1 pb-4 border-b border-slate-100">
              <div className="text-xs font-mono text-sky-700">{activeSeq.standard}</div>
              <h3 className="font-display text-2xl font-semibold text-slate-900">
                {activeSeq.title}
              </h3>
              <p className="text-sm text-slate-600">{activeSeq.description}</p>
            </div>

            <div className="space-y-2.5">
              {userOrder.map((stepText, idx) => {
                const isRightSpot = seqMatches[idx];
                let borderStyle = 'border-slate-200 bg-white';
                if (seqChecked) {
                  borderStyle = isRightSpot
                    ? 'border-emerald-400 bg-emerald-50/60'
                    : 'border-red-300 bg-red-50/60';
                }
                return (
                  <div
                    key={stepText}
                    className={`border rounded-xl px-4 py-3 flex items-center justify-between gap-4 transition-colors ${borderStyle}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-semibold text-slate-700 flex items-center justify-center shrink-0 tabular-nums">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-slate-800 leading-snug">{stepText}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {seqChecked && (
                        <span
                          className={`text-xs font-medium mr-2 ${
                            isRightSpot ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isRightSpot ? 'Зөв байрлал' : 'Зөрсөн'}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveStep(idx, -1)}
                        aria-label="Дээш шилжүүлэх"
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === userOrder.length - 1}
                        onClick={() => moveStep(idx, 1)}
                        aria-label="Доош шилжүүлэх"
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-slate-700"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {seqChecked && (
              <div
                className={`rounded-lg p-4 border text-sm flex items-start gap-2.5 ${
                  seqAllCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {seqAllCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold mb-0.5">
                    {seqAllCorrect
                      ? 'Бүх алхам технологийн дагуу яг зөв дараалалд орлоо!'
                      : 'Зарим алхмын дараалал зөрсөн байна — улаан хүрээтэй алхмыг засна уу.'}
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">{activeSeq.reasonNote}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => selectSequence(seqIdx)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Дахин холих</span>
              </button>
              <button
                type="button"
                onClick={handleCheckSequence}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition-colors"
              >
                Дараалал шалгах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Field Fault Diagnosis */}
      {mode === 'faults' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Талбайн гэмтлийн тохиолдлууд
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Бодит дуудлагын шинж тэмдэгт тулгуурлан үндсэн шалтгаан болон зөв засварын шийдлийг оношилно уу.
            </p>
            <div className="space-y-2 pt-2">
              {REINFORCEMENT_FAULTS.map((item, idx) => {
                const done = completedDrillIds.includes(item.id);
                const active = idx === faultIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectFault(idx)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-start gap-2.5 ${
                      active
                        ? 'border-sky-600 bg-sky-50/70'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        done ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <div className="text-sm font-medium text-slate-900 leading-snug">
                      Тохиолдол 0{idx + 1}: {item.symptom}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <div className="text-xs font-mono text-slate-500">{activeFault.siteContext}</div>
              <h3 className="font-display text-2xl font-semibold text-slate-900 leading-snug">
                Шинж тэмдэг: {activeFault.symptom}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Step A: Pick Root Cause */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-700">
                  1. Үндсэн шалтгааныг сонгоно уу
                </div>
                {activeFault.causes.map((c, idx) => {
                  const selected = pickedCause === idx;
                  const isRight = idx === activeFault.correctCauseIndex;
                  let cls = 'border-slate-200 bg-white hover:border-slate-300 text-slate-800';
                  if (faultChecked) {
                    if (isRight) cls = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
                    else if (selected) cls = 'border-red-400 bg-red-50/70 text-red-950';
                  } else if (selected) {
                    cls = 'border-sky-600 bg-sky-50/70 text-slate-900 font-medium';
                  }
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        playWrenchClick(false);
                        setPickedCause(idx);
                        setFaultChecked(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-lg border text-sm leading-snug transition-colors ${cls}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              {/* Step B: Pick Master Fix */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-700">
                  2. Мастерын засварын шийдэл
                </div>
                {activeFault.fixes.map((f, idx) => {
                  const selected = pickedFix === idx;
                  const isRight = idx === activeFault.correctFixIndex;
                  let cls = 'border-slate-200 bg-white hover:border-slate-300 text-slate-800';
                  if (faultChecked) {
                    if (isRight) cls = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
                    else if (selected) cls = 'border-red-400 bg-red-50/70 text-red-950';
                  } else if (selected) {
                    cls = 'border-sky-600 bg-sky-50/70 text-slate-900 font-medium';
                  }
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        playWrenchClick(false);
                        setPickedFix(idx);
                        setFaultChecked(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-lg border text-sm leading-snug transition-colors ${cls}`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            {faultChecked && (
              <div
                className={`rounded-lg p-4 border text-sm space-y-1 ${
                  faultBothCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-amber-50 border-amber-200 text-amber-950'
                }`}
              >
                <div className="font-semibold">
                  {faultBothCorrect
                    ? 'Онош ба шийдэл 100% зөв!'
                    : 'Шалтгаан эсвэл засварын сонголтыг дахин нягтална уу.'}
                </div>
                <p className="text-xs leading-relaxed opacity-90">{activeFault.masterNote}</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={pickedCause === null || pickedFix === null}
                onClick={handleCheckFault}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold transition-colors"
              >
                Онош баталгаажуулах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Fast Norm Recall Flashcards */}
      {mode === 'flashcards' && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 tabular-nums">
            <span>
              Карт {cardIdx + 1} / {REINFORCEMENT_FLASHCARDS.length} · {activeCard.category}
            </span>
            <span>
              Тогтоосон: {masteredFlashcardIds.length} / {REINFORCEMENT_FLASHCARDS.length}
            </span>
          </div>

          {/* Interactive Card Surface */}
          <button
            type="button"
            onClick={() => {
              playWrenchClick(false);
              setCardFlipped((f) => !f);
            }}
            className={`w-full text-left rounded-2xl border p-8 sm:p-10 min-h-[260px] flex flex-col justify-between transition-colors ${
              cardFlipped
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 hover:border-sky-600 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={cardFlipped ? 'text-sky-400' : 'text-sky-700'}>
                {cardFlipped ? 'ХАРИУЛТ БА СТАНДАРТ' : 'АСУУЛТ · ДАРЖ ЭРГҮҮЛНЭ ҮҮ'}
              </span>
              {isCardMastered && (
                <span className={cardFlipped ? 'text-emerald-400' : 'text-emerald-700'}>
                  Тогтоосон ✓
                </span>
              )}
            </div>

            <div className="my-6 space-y-3">
              {!cardFlipped ? (
                <h3 className="font-display text-2xl sm:text-3xl font-semibold leading-snug">
                  {activeCard.prompt}
                </h3>
              ) : (
                <>
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-sky-300 tabular-nums">
                    {activeCard.answer}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{activeCard.detail}</p>
                </>
              )}
            </div>

            <div className={`text-xs ${cardFlipped ? 'text-slate-400' : 'text-slate-500'}`}>
              {cardFlipped ? 'Асуулт руу буцах бол дарна уу' : 'Хариултыг харах бол карт дээр дарна уу'}
            </div>
          </button>

          {/* Card Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCardFlipped(false);
                  setCardIdx((i) =>
                    i === 0 ? REINFORCEMENT_FLASHCARDS.length - 1 : i - 1
                  );
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Өмнөх</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCardFlipped(false);
                  setCardIdx((i) => (i + 1) % REINFORCEMENT_FLASHCARDS.length);
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1"
              >
                <span>Дараагийн</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                playSuccessChime(false);
                onToggleFlashcard(activeCard.id);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isCardMastered
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCardMastered ? 'Тогтоосон (Цуцлах)' : 'Бүрэн тогтоосон'}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
