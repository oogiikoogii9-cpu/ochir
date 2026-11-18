import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  BookOpen,
  AlertTriangle,
  Wrench,
  Calculator,
  ChevronRight,
} from 'lucide-react';
import { THEORY_CHAPTERS } from '../data/curriculum';

interface TheoryModuleProps {
  completedIds: string[];
  onToggleComplete: (id: string) => void;
  onGoToSimulation: () => void;
}

const PPR_NORM_DATA: Record<number, { depth: number; heat: number; join: number; cool: number }> = {
  20: { depth: 14.5, heat: 5, join: 4, cool: 2 },
  25: { depth: 16.0, heat: 7, join: 4, cool: 2 },
  32: { depth: 18.5, heat: 8, join: 6, cool: 4 },
  40: { depth: 20.5, heat: 12, join: 6, cool: 4 },
  50: { depth: 23.5, heat: 18, join: 6, cool: 4 },
};

export const TheoryModule: React.FC<TheoryModuleProps> = ({
  completedIds,
  onToggleComplete,
  onGoToSimulation,
}) => {
  const [activeId, setActiveId] = useState<string>(THEORY_CHAPTERS[0].id);
  const [calcDn, setCalcDn] = useState<number>(25);
  const [drainDn, setDrainDn] = useState<50 | 110>(110);
  const [drainLengthM, setDrainLengthM] = useState<number>(4.5);

  const activeChapter =
    THEORY_CHAPTERS.find((c) => c.id === activeId) ?? THEORY_CHAPTERS[0];
  const isCompleted = completedIds.includes(activeChapter.id);

  const pprSpec = PPR_NORM_DATA[calcDn];
  const optimalSlope = drainDn === 50 ? 0.03 : 0.02;
  const totalDropCm = (drainLengthM * optimalSlope * 100).toFixed(1);

  return (
    <section aria-label="Онолын сургалт" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Curriculum Index + Engineering Calculator */}
      <aside className="lg:col-span-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
              Сургалтын сэдвүүд
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {completedIds.length} / {THEORY_CHAPTERS.length} дууссан
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {THEORY_CHAPTERS.map((chapter) => {
              const active = chapter.id === activeId;
              const done = completedIds.includes(chapter.id);
              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => setActiveId(chapter.id)}
                  className={`w-full text-left py-3.5 px-3 -mx-1 rounded-lg transition-colors flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                    active ? 'bg-sky-50/80 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label="Дууссан" />
                    ) : (
                      <Circle
                        className={`w-4 h-4 ${active ? 'text-sky-600' : 'text-slate-300'}`}
                        aria-label="Уншаагүй"
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500 font-mono tabular-nums mb-0.5">
                      {chapter.number}. {chapter.standardRef}
                    </div>
                    <div className={`text-sm leading-snug ${active ? 'font-semibold text-slate-900' : 'font-medium'}`}>
                      {chapter.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Embedded Interactive Engineering Calculator */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2.5 text-slate-900">
            <Calculator className="w-4 h-4 text-sky-600 shrink-0" />
            <h3 className="text-sm font-semibold">Инженерийн шуурхай тооцоолуур</h3>
          </div>

          {/* PPR Calculator */}
          <div className="space-y-3 pb-4 border-b border-slate-100">
            <div className="text-xs font-medium text-slate-600">
              PP-R хоолой гагнуурын норм (260 °C)
            </div>
            <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="PP-R голч сонгох">
              {[20, 25, 32, 40, 50].map((dn) => (
                <button
                  key={dn}
                  type="button"
                  onClick={() => setCalcDn(dn)}
                  className={`py-2 text-xs font-mono tabular-nums rounded-md border transition-colors whitespace-nowrap ${
                    calcDn === dn
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {dn}
                </button>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-slate-50 rounded-lg p-2.5">
                <dt className="text-slate-500">Суулгах гүн</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  {pprSpec.depth} мм
                </dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5">
                <dt className="text-slate-500">Халаах хугацаа</dt>
                <dd className="font-mono font-semibold text-sky-700 tabular-nums mt-0.5">
                  {pprSpec.heat} сек
                </dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5">
                <dt className="text-slate-500">Барьцалдуулах</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  {pprSpec.join} сек
                </dd>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5">
                <dt className="text-slate-500">Хөргөх хугацаа</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                  {pprSpec.cool} мин
                </dd>
              </div>
            </dl>
          </div>

          {/* Drainage Slope Calculator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Бохир усны уналт тооцох</span>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-md">
                {([50, 110] as const).map((dn) => (
                  <button
                    key={dn}
                    type="button"
                    onClick={() => setDrainDn(dn)}
                    className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                      drainDn === dn
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600'
                    }`}
                  >
                    DN{dn}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <label htmlFor="drain-len-slider" className="text-slate-500">
                  Хэвтээ шугамын урт
                </label>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {drainLengthM.toFixed(1)} м
                </span>
              </div>
              <input
                id="drain-len-slider"
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={drainLengthM}
                onChange={(e) => setDrainLengthM(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5 text-xs">
              <span className="text-slate-600">
                Шаардлагатай өндрийн зөрүү (i={optimalSlope}):
              </span>
              <span className="font-mono font-semibold text-sky-700 tabular-nums text-sm">
                {totalDropCm} см
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Detailed Chapter View */}
      <article className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-8">
        <header className="space-y-3 pb-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-medium text-sky-700">
              Бүлэг {activeChapter.number}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{activeChapter.standardRef}</span>
            <span aria-hidden="true">·</span>
            <span>{activeChapter.readTime}</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight leading-tight text-balance">
            {activeChapter.title}
          </h2>

          <p className="text-[15px] leading-relaxed text-slate-600 max-w-3xl">
            {activeChapter.summary}
          </p>
        </header>

        {/* Key Technical Specs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeChapter.keySpecs.map((spec) => (
            <div key={spec.label} className="bg-slate-50 rounded-lg p-3.5">
              <div className="text-xs text-slate-500 leading-snug">{spec.label}</div>
              <div className="font-mono text-sm font-semibold text-slate-900 mt-1 tabular-nums">
                {spec.value}
              </div>
            </div>
          ))}
        </div>

        {/* Step-by-Step Execution Sequence */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Wrench className="w-4 h-4 text-sky-600 shrink-0" />
            <h3 className="text-base font-semibold">Гүйцэтгэлийн технологийн дараалал</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeChapter.steps.map((step) => (
              <div
                key={step.title}
                className="border border-slate-200 rounded-lg p-4 space-y-1.5"
              >
                <h4 className="text-sm font-semibold text-slate-900">{step.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Engineering Data Table */}
        {activeChapter.table && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />
              <h3 className="text-base font-semibold">{activeChapter.table.caption}</h3>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {activeChapter.table.headers.map((h) => (
                      <th
                        key={h}
                        className="py-2.5 px-3.5 text-xs font-semibold text-slate-700 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeChapter.table.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`py-2.5 px-3.5 tabular-nums whitespace-nowrap ${
                            cIdx === 0
                              ? 'font-mono font-semibold text-slate-900'
                              : 'font-mono text-slate-700 text-xs'
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Common Mistakes & Solutions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="text-base font-semibold">Түгээмэл алдаа ба мастерын шийдэл</h3>
          </div>
          <div className="space-y-3">
            {activeChapter.mistakes.map((m, i) => (
              <div
                key={i}
                className="bg-amber-50/50 border border-amber-200/80 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
              >
                <div>
                  <div className="text-xs font-semibold text-amber-800 mb-1">
                    × Буруу гүйцэтгэл
                  </div>
                  <p className="text-slate-700 leading-relaxed">{m.wrong}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-800 mb-1">
                    ✓ Зөв шийдэл
                  </div>
                  <p className="text-slate-700 leading-relaxed">{m.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Action Footer */}
        <footer className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onToggleComplete(activeChapter.id)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompleted ? 'Уншиж дууссан ✓' : 'Сэдвийг дууссан гэж тэмдэглэх'}</span>
          </button>

          <button
            type="button"
            onClick={onGoToSimulation}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Симуляц дээр турших</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      </article>
    </section>
  );
};
